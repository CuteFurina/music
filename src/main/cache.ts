import { db, Tables } from './db'
import type { FetchTracksResponse } from '@/shared/api/Track'
import { app } from 'electron'
import { Request, Response } from 'express'
import log from './log'
import fs from 'fs'
import * as musicMetadata from 'music-metadata'
import { APIs, APIsParams, APIsResponse } from '../shared/CacheAPIs'

class Cache {
  constructor() {
    //
  }

  set(api: string, data: any, query: any = {}) {
    switch (api) {
      case APIs.UserPlaylist:
      case APIs.UserAccount:
      case APIs.Personalized:
      case APIs.RecommendResource:
      case APIs.UserAlbums:
      case APIs.UserArtists:
      case APIs.Likelist: {
        if (!data) return
        db.upsert(Tables.AccountData, {
          id: api,
          json: JSON.stringify(data),
          updatedAt: Date.now(),
        })
        break
      }
      case APIs.Track: {
        if (!data.songs) return
        const tracks = (data as FetchTracksResponse).songs.map(t => ({
          id: t.id,
          json: JSON.stringify(t),
          updatedAt: Date.now(),
        }))
        db.upsertMany(Tables.Track, tracks)
        break
      }
      case APIs.Album: {
        if (!data.album) return
        data.album.songs = data.songs
        db.upsert(Tables.Album, {
          id: data.album.id,
          json: JSON.stringify(data.album),
          updatedAt: Date.now(),
        })
        break
      }
      case APIs.Playlist: {
        if (!data.playlist) return
        db.upsert(Tables.Playlist, {
          id: data.playlist.id,
          json: JSON.stringify(data),
          updatedAt: Date.now(),
        })
        break
      }
      case APIs.Artist: {
        if (!data.artist) return
        db.upsert(Tables.Artist, {
          id: data.artist.id,
          json: JSON.stringify(data),
          updatedAt: Date.now(),
        })
        break
      }
      case APIs.ArtistAlbum: {
        if (!data.hotAlbums) return
        db.createMany(
          Tables.Album,
          data.hotAlbums.map((a: Album) => ({
            id: a.id,
            json: JSON.stringify(a),
            updatedAt: Date.now(),
          }))
        )
        const modifiedData = {
          ...data,
          hotAlbums: data.hotAlbums.map((a: Album) => a.id),
        }
        db.upsert(Tables.ArtistAlbum, {
          id: data.artist.id,
          json: JSON.stringify(modifiedData),
          updatedAt: Date.now(),
        })
        break
      }
      case APIs.Lyric: {
        if (!data.lrc) return
        db.upsert(Tables.Lyric, {
          id: query.id,
          json: JSON.stringify(data),
          updatedAt: Date.now(),
        })
        break
      }
      case APIs.CoverColor: {
        if (!data.id || !data.color) return
        if (/^#([a-fA-F0-9]){3}$|[a-fA-F0-9]{6}$/.test(data.color) === false) {
          return
        }
        db.upsert(Tables.CoverColor, {
          id: data.id,
          color: data.color,
        })
      }
    }
  }

  get<T extends keyof APIsParams>(api: T, params: any): any {
    switch (api) {
      case APIs.UserPlaylist:
      case APIs.UserAccount:
      case APIs.Personalized:
      case APIs.RecommendResource:
      case APIs.Likelist: {
        const data = db.find(Tables.AccountData, api)
        if (data?.json) return JSON.parse(data.json)
        break
      }
      case APIs.Track: {
        const ids: number[] = params?.ids
          .split(',')
          .map((id: string) => Number(id))
        if (ids.length === 0) return

        if (ids.includes(NaN)) return

        const tracksRaw = db.findMany(Tables.Track, ids)

        if (tracksRaw.length !== ids.length) {
          return
        }
        const tracks = ids.map(id => {
          const track = tracksRaw.find(t => t.id === Number(id)) as any
          return JSON.parse(track.json)
        })
        return {
          code: 200,
          songs: tracks,
          privileges: {},
        }
      }
      case APIs.Album: {
        if (isNaN(Number(params?.id))) return
        const data = db.find(Tables.Album, params.id)
        if (data?.json)
          return {
            resourceState: true,
            songs: [],
            code: 200,
            album: JSON.parse(data.json),
          }
        break
      }
      case APIs.Playlist: {
        if (isNaN(Number(params?.id))) return
        const data = db.find(Tables.Playlist, params.id)
        if (data?.json) return JSON.parse(data.json)
        break
      }
      case APIs.Artist: {
        if (isNaN(Number(params?.id))) return
        const data = db.find(Tables.Artist, params.id)
        if (data?.json) return JSON.parse(data.json)
        break
      }
      case APIs.ArtistAlbum: {
        if (isNaN(Number(params?.id))) return

        const artistAlbumsRaw = db.find(Tables.ArtistAlbum, params.id)
        if (!artistAlbumsRaw?.json) return
        const artistAlbums = JSON.parse(artistAlbumsRaw.json)

        const albumsRaw = db.findMany(Tables.Album, artistAlbums.hotAlbums)
        if (albumsRaw.length !== artistAlbums.hotAlbums.length) return
        const albums = albumsRaw.map(a => JSON.parse(a.json))

        artistAlbums.hotAlbums = artistAlbums.hotAlbums.map((id: number) =>
          albums.find(a => a.id === id)
        )
        return artistAlbums
      }
      case APIs.Lyric: {
        if (isNaN(Number(params?.id))) return
        const data = db.find(Tables.Lyric, params.id)
        if (data?.json) return JSON.parse(data.json)
        break
      }
      case APIs.CoverColor: {
        if (isNaN(Number(params?.id))) return
        return db.find(Tables.CoverColor, params.id)?.color
      }
    }
  }

  getForExpress(api: string, req: Request) {
    // Get track detail cache
    if (api === APIs.Track) {
      const cache = this.get(api, req.query)
      if (cache) {
        log.debug(`[cache] Cache hit for ${req.path}`)
        return cache
      }
    }

    // Get audio cache if API is song/detail
    if (api === APIs.SongUrl) {
      const cache = db.find(Tables.Audio, Number(req.query.id))
      if (!cache) return

      const audioFileName = `${cache.id}-${cache.br}.${cache.type}`

      const isAudioFileExists = fs.existsSync(
        `${app.getPath('userData')}/audio_cache/${audioFileName}`
      )
      if (!isAudioFileExists) return

      log.debug(`[cache] Audio cache hit for ${req.path}`)

      return {
        data: [
          {
            source: cache.source,
            id: cache.id,
            url: `http://127.0.0.1:42710/yesplaymusic/audio/${audioFileName}`,
            br: cache.br,
            size: 0,
            md5: '',
            code: 200,
            expi: 0,
            type: cache.type,
            gain: 0,
            fee: 8,
            uf: null,
            payed: 0,
            flag: 4,
            canExtend: false,
            freeTrialInfo: null,
            level: 'standard',
            encodeType: cache.type,
            freeTrialPrivilege: {
              resConsumable: false,
              userConsumable: false,
              listenType: null,
            },
            freeTimeTrialPrivilege: {
              resConsumable: false,
              userConsumable: false,
              type: 0,
              remainTime: 0,
            },
            urlSource: 0,
          },
        ],
        code: 200,
      }
    }
  }

  getAudio(fileName: string, res: Response) {
    if (!fileName) {
      return res.status(400).send({ error: 'No filename provided' })
    }
    const id = Number(fileName.split('-')[0])

    try {
      const path = `${app.getPath('userData')}/audio_cache/${fileName}`
      const audio = fs.readFileSync(path)
      if (audio.byteLength === 0) {
        db.delete(Tables.Audio, id)
        fs.unlinkSync(path)
        return res.status(404).send({ error: 'Audio not found' })
      }
      res.send(audio)
    } catch (error) {
      res.status(500).send({ error })
    }
  }

  async setAudio(
    buffer: Buffer,
    { id, source }: { id: number; source: string }
  ) {
    const path = `${app.getPath('userData')}/audio_cache`

    try {
      fs.statSync(path)
    } catch (e) {
      fs.mkdirSync(path)
    }

    const meta = await musicMetadata.parseBuffer(buffer)
    const br = meta.format.bitrate
    const type = {
      'MPEG 1 Layer 3': 'mp3',
      'Ogg Vorbis': 'ogg',
      AAC: 'm4a',
      FLAC: 'flac',
      unknown: 'unknown',
    }[meta.format.codec ?? 'unknown']

    await fs.writeFile(`${path}/${id}-${br}.${type}`, buffer, error => {
      if (error) {
        return log.error(`[cache] cacheAudio failed: ${error}`)
      }
      log.info(`Audio file ${id}-${br}.${type} cached!`)

      db.upsert(Tables.Audio, {
        id,
        br,
        type,
        source,
        updateAt: Date.now(),
      })

      log.info(`[cache] cacheAudio ${id}-${br}.${type}`)
    })
  }
}

export default new Cache()
