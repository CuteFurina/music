import { Howl, Howler } from 'howler'
import {
  fetchAudioSourceWithReactQuery,
  fetchTracksWithReactQuery,
} from '@/hooks/useTracks'
import { fetchPersonalFMWithReactQuery } from '@/hooks/usePersonalFM'
import { fmTrash } from '@/api/personalFM'
import { cacheAudio } from '@/api/yesplaymusic'
import { clamp } from 'lodash-es'
import axios from 'axios'
import { resizeImage } from './common'
import { fetchPlaylistWithReactQuery } from '@/hooks/usePlaylist'
import { fetchAlbumWithReactQuery } from '@/hooks/useAlbum'

type TrackID = number
enum TrackListSourceType {
  ALBUM = 'album',
  PLAYLIST = 'playlist',
}
interface TrackListSource {
  type: TrackListSourceType
  id: number
}
export enum Mode {
  PLAYLIST = 'playlist',
  FM = 'fm',
}
export enum State {
  INITIALIZING = 'initializing',
  READY = 'ready',
  PLAYING = 'playing',
  PAUSED = 'paused',
  LOADING = 'loading',
}
export enum RepeatMode {
  OFF = 'off',
  ON = 'on',
  ONE = 'one',
}

const PLAY_PAUSE_FADE_DURATION = 200

let _howler = new Howl({ src: [''], format: ['mp3', 'flac'] })
export class Player {
  private _track: Track | null = null
  private _trackIndex: number = 0
  private _progress: number = 0
  private _progressInterval: ReturnType<typeof setInterval> | undefined
  private _volume: number = 1 // 0 to 1

  state: State = State.INITIALIZING
  mode: Mode = Mode.PLAYLIST
  trackList: TrackID[] = []
  trackListSource: TrackListSource | null = null
  fmTrackList: TrackID[] = []
  shuffle: boolean = false
  repeatMode: RepeatMode = RepeatMode.OFF
  fmTrack: Track | null = null

  init() {
    this.state = State.READY
    this._initFM()
  }

  /**
   * Get prev track index
   */
  get _prevTrackIndex(): number | undefined {
    switch (this.repeatMode) {
      case RepeatMode.ONE:
        return this._trackIndex
      case RepeatMode.OFF:
        if (this._trackIndex === 0) return 0
        return this._trackIndex - 1
      case RepeatMode.ON:
        if (this._trackIndex - 1 < 0) return this.trackList.length - 1
        return this._trackIndex - 1
    }
  }

  /**
   * Get next track index
   */
  get _nextTrackIndex(): number | undefined {
    switch (this.repeatMode) {
      case RepeatMode.ONE:
        return this._trackIndex
      case RepeatMode.OFF:
        if (this._trackIndex + 1 >= this.trackList.length) return
        return this._trackIndex + 1
      case RepeatMode.ON:
        if (this._trackIndex + 1 >= this.trackList.length) return 0
        return this._trackIndex + 1
    }
  }

  /**
   * Get current playing track ID
   */
  get trackID(): TrackID {
    if (this.mode === Mode.PLAYLIST) {
      const { trackList, _trackIndex } = this
      return trackList[_trackIndex] ?? 0
    }
    return this.fmTrackList[0] ?? 0
  }

  /**
   * Get current playing track
   */
  get track(): Track | null {
    return this.mode === Mode.FM ? this.fmTrack : this._track
  }

  /**
   * Get/Set progress of current track
   */
  get progress(): number {
    return this.state === State.LOADING ? 0 : this._progress
  }
  set progress(value) {
    this._progress = value
    _howler.seek(value)
  }

  /**
   * Get/Set current volume
   */
  get volume(): number {
    return this._volume
  }
  set volume(value) {
    this._volume = clamp(value, 0, 1)
    Howler.volume(this._volume)
  }

  private async _initFM() {
    const response = await fetchPersonalFMWithReactQuery()
    this.fmTrackList.push(...(response?.data?.map(r => r.id) ?? []))

    const trackId = this.fmTrackList[0]
    const track = await this._fetchTrack(trackId)
    if (track) this.fmTrack = track
  }

  private _setupProgressInterval() {
    this._progressInterval = setInterval(() => {
      if (this.state === State.PLAYING) this._progress = _howler.seek()
    }, 1000)
  }

  /**
   * Fetch track details from Netease based on this.trackID
   */
  private async _fetchTrack(trackID: TrackID) {
    const response = await fetchTracksWithReactQuery({ ids: [trackID] })
    return response?.songs?.length ? response.songs[0] : null
  }

  /**
   * Fetch track audio source url from Netease
   * @param {TrackID} trackID
   */
  private async _fetchAudioSource(trackID: TrackID) {
    const response = await fetchAudioSourceWithReactQuery({ id: trackID })
    return {
      audio: response.data?.[0]?.url,
      id: trackID,
    }
  }

  /**
   * Play a track based on this.trackID
   */
  private async _playTrack() {
    this.state = State.LOADING
    const track = await this._fetchTrack(this.trackID)
    if (!track) {
      toast('加载歌曲信息失败')
      return
    }
    if (this.mode === Mode.PLAYLIST) this._track = track
    if (this.mode === Mode.FM) this.fmTrack = track
    this._playAudio()
  }

  /**
   * Play audio via howler
   */
  private async _playAudio() {
    this._progress = 0
    const { audio, id } = await this._fetchAudioSource(this.trackID)
    if (!audio) {
      toast('无法播放此歌曲')
      return
    }
    if (this.trackID !== id) return
    Howler.unload()
    const howler = new Howl({
      src: [`${audio}?id=${id}`],
      format: ['mp3', 'flac'],
      html5: true,
      autoplay: true,
      volume: 1,
      onend: () => this._howlerOnEndCallback(),
    })
    _howler = howler
    this.play()
    this.state = State.PLAYING
    _howler.once('load', () => {
      this._cacheAudio(_howler._src)
    })

    if (!this._progressInterval) {
      this._setupProgressInterval()
    }
  }

  private _howlerOnEndCallback() {
    if (this.mode !== Mode.FM && this.repeatMode === RepeatMode.ONE) {
      _howler.seek(0)
      _howler.play()
    } else {
      this.nextTrack()
    }
  }

  private _cacheAudio(audio: string) {
    if (audio.includes('yesplaymusic')) return
    const id = Number(audio.split('?id=')[1])
    if (isNaN(id) || !id) return
    cacheAudio(id, audio)
  }

  private async _nextFMTrack() {
    this.fmTrackList.shift()
    this._playTrack()

    const loadMoreTracks = async () => {
      if (this.fmTrackList.length <= 5) {
        const response = await fetchPersonalFMWithReactQuery()
        this.fmTrackList.push(...(response?.data?.map(r => r.id) ?? []))
      }
    }
    const prefetchNextTrack = async () => {
      const prefetchTrackID = this.fmTrackList[1]
      const track = await this._fetchTrack(prefetchTrackID)
      if (track?.al.picUrl) axios.get(resizeImage(track.al.picUrl, 'md'))
    }

    loadMoreTracks()
    prefetchNextTrack()
  }

  /**
   * Play current track
   * @param {boolean} fade fade in
   */
  play(fade: boolean = false) {
    if (_howler.playing()) {
      this.state = State.PLAYING
      return
    }

    _howler.play()
    if (fade) {
      this.state = State.PLAYING
      _howler.once('play', () => {
        _howler.fade(0, this._volume, PLAY_PAUSE_FADE_DURATION)
      })
    } else {
      this.state = State.PLAYING
    }
  }

  /**
   * Pause current track
   * @param {boolean} fade fade out
   */
  pause(fade: boolean = false) {
    if (fade) {
      _howler.fade(this._volume, 0, PLAY_PAUSE_FADE_DURATION)
      this.state = State.PAUSED
      _howler.once('fade', () => {
        _howler.pause()
      })
    } else {
      this.state = State.PAUSED
      _howler.pause()
    }
  }

  /**
   * Play or pause current track
   * @param {boolean} fade fade in-out
   */
  playOrPause(fade: boolean = true) {
    this.state === State.PLAYING ? this.pause(fade) : this.play(fade)
  }

  /**
   * Play previous track
   */
  prevTrack() {
    this._progress = 0
    if (this.mode === Mode.FM) {
      toast('Personal FM not support previous track')
      return
    }
    if (this._prevTrackIndex === undefined) {
      toast('No previous track')
      return
    }
    this._trackIndex = this._prevTrackIndex
    this._playTrack()
  }

  /**
   * Play next track
   */
  nextTrack(forceFM: boolean = false) {
    this._progress = 0
    if (forceFM || this.mode === Mode.FM) {
      this.mode = Mode.FM
      this._nextFMTrack()
      return
    }
    if (this._nextTrackIndex === undefined) {
      toast('没有下一首了')
      this.pause()
      return
    }
    this._trackIndex = this._nextTrackIndex
    this._playTrack()
  }

  /**
   * 播放一个track id列表
   * @param {number[]} list
   * @param {null|number} autoPlayTrackID
   */
  playAList(list: TrackID[], autoPlayTrackID?: null | number) {
    this.mode = Mode.PLAYLIST
    this.trackList = list
    this._trackIndex = autoPlayTrackID
      ? list.findIndex(t => t === autoPlayTrackID)
      : 0
    this._playTrack()
  }

  /**
   * Play a playlist
   * @param  {number} playlistID
   * @param  {null|number=} autoPlayTrackID
   */
  async playPlaylist(playlistID: number, autoPlayTrackID?: null | number) {
    const playlist = await fetchPlaylistWithReactQuery({ id: playlistID })
    if (!playlist?.playlist?.trackIds?.length) return
    this.trackListSource = {
      type: TrackListSourceType.PLAYLIST,
      id: playlistID,
    }
    this.playAList(
      playlist.playlist.trackIds.map(t => t.id),
      autoPlayTrackID
    )
  }

  /**
   * Play am album
   * @param  {number} albumID
   * @param  {null|number=} autoPlayTrackID
   */
  async playAlbum(albumID: number, autoPlayTrackID?: null | number) {
    const album = await fetchAlbumWithReactQuery({ id: albumID })
    if (!album?.songs?.length) return
    this.trackListSource = {
      type: TrackListSourceType.ALBUM,
      id: albumID,
    }
    this._playTrack()
    this.playAList(
      album.songs.map(t => t.id),
      autoPlayTrackID
    )
  }

  /**
   *  Play personal fm
   */
  async playFM() {
    this.mode = Mode.FM
    if (
      this.fmTrackList.length > 0 &&
      this.fmTrack?.id === this.fmTrackList[0]
    ) {
      this._track = this.fmTrack
      this._playAudio()
    } else {
      this._playTrack()
    }
  }

  /**
   * Trash current PersonalFMTrack
   */
  async fmTrash() {
    const trashTrackID = this.fmTrackList[0]
    fmTrash(trashTrackID)
    this._nextFMTrack()
  }

  /**
   * Play track in trackList by id
   */
  async playTrack(trackID: TrackID) {
    const index = this.trackList.findIndex(t => t === trackID)
    if (!index) toast('播放失败，歌曲不在列表内')
    this._trackIndex = index
    this._playTrack()
  }
}

export const player = new Player()

if (import.meta.env.DEV) {
  window.howler = _howler
}
