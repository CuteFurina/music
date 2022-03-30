import { Howl, Howler } from 'howler'
import {
  fetchAudioSourceWithReactQuery,
  fetchTracksWithReactQuery,
} from '@/hooks/useTracks'
import { fetchPersonalFMWithReactQuery } from '@/hooks/usePersonalFM'
import { fmTrash } from '@/api/personalFM'
import { cacheAudio } from '@/api/yesplaymusic'
import { clamp } from 'lodash-es'

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
  private _fmTrack: Track | null = null
  private _fmInited = false

  state: State = State.INITIALIZING
  mode: Mode = Mode.PLAYLIST
  trackList: TrackID[] = []
  trackListSource: TrackListSource | null = null
  fmTrackList: TrackID[] = []
  shuffle: boolean = false
  repeatMode: RepeatMode = RepeatMode.OFF

  constructor() {
    //
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
    return this._track ?? null
  }

  get fmTrack(): Track | null {
    return this._fmTrack ?? null
  }

  /**
   * Get/Set progress of current track
   */
  get progress(): number {
    return this._progress
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

  private _setupProgressInterval() {
    this._progressInterval = setInterval(() => {
      if (this.state === State.PLAYING) this._progress = _howler.seek()
    }, 1000)
  }

  /**
   * Fetch track details from Netease based on this.trackID
   */
  private async _fetchTrack(trackID: TrackID) {
    this.state = State.LOADING
    const response = await fetchTracksWithReactQuery({ ids: [trackID] })
    if (response.songs.length) {
      return response.songs[0]
    }
  }

  /**
   * Fetch track audio source url from Netease
   * @param {TrackID} trackID
   */
  private async _fetchAudioSource(trackID: TrackID) {
    const response = await fetchAudioSourceWithReactQuery({ id: trackID })
    if (response.data?.[0]?.url) return response.data[0].url
  }

  /**
   * Play a track based on this.trackID
   */
  private async _playTrack() {
    const track = await this._fetchTrack(this.trackID)
    if (track) this._track = track
    if (track && this.mode === Mode.FM) this._fmTrack = track
    this._playAudio()
  }

  /**
   * Play audio via howler
   */
  private async _playAudio() {
    const audio = await this._fetchAudioSource(this.trackID)
    if (!audio) {
      toast('Failed to load audio source')
      return
    }
    Howler.unload()
    const howler = new Howl({
      src: [audio],
      format: ['mp3', 'flac'],
      html5: true,
      autoplay: true,
      volume: 1,
      onend: () => this._howlerOnEndCallback(),
    })
    _howler = howler
    this.play()
    this.state = State.PLAYING

    this._cacheAudio(this.trackID, audio)

    if (!this._progressInterval) {
      this._setupProgressInterval()
    }
  }

  private _howlerOnEndCallback() {
    console.log('_howlerOnEndCallback')
    if (this.mode !== Mode.FM && this.repeatMode === RepeatMode.ONE) {
      _howler.seek(0)
      _howler.play()
    } else {
      this.nextTrack()
    }
  }

  private _cacheAudio(id: number, audio: string) {
    if (audio.includes('yesplaymusic')) return
    cacheAudio(id, audio)
  }

  private async _nextFMTrack() {
    if (this.fmTrackList.length <= 1) {
      for (let i = 0; i < 5; i++) {
        const response = await fetchPersonalFMWithReactQuery()
        if (!response?.data?.length) continue
        this.fmTrackList.shift()
        this.fmTrackList.push(...response?.data?.map(r => r.id))

        this._playTrack()
        break
      }
    } else {
      this.fmTrackList.shift()
      this._playTrack()
      if (this.fmTrackList.length <= 1) {
        const response = await fetchPersonalFMWithReactQuery()
        this.fmTrackList.push(...response?.data?.map(r => r.id))
      }
    }
  }

  /**
   * Play current track
   * @param {boolean} fade fade in
   */
  play(fade: boolean = false) {
    if (_howler.playing()) return

    const setPlayState = () => {
      this.state = State.PLAYING
    }

    _howler.play()
    if (fade) {
      _howler.once('play', () => {
        _howler.fade(0, this._volume, PLAY_PAUSE_FADE_DURATION)
        setPlayState()
      })
    } else {
      setPlayState()
    }
  }

  /**
   * Pause current track
   * @param {boolean} fade fade out
   */
  pause(fade: boolean = false) {
    const setPauseState = () => {
      _howler.pause()
      this.state = State.PAUSED
    }

    if (fade) {
      _howler.fade(this._volume, 0, PLAY_PAUSE_FADE_DURATION)
      _howler.once('fade', () => {
        setPauseState()
      })
    } else {
      setPauseState()
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
    console.log(this)
    if (forceFM || this.mode === Mode.FM) {
      this.mode = Mode.FM
      this._nextFMTrack()
      return
    }
    if (this._nextTrackIndex === undefined) {
      toast('No next track')
      this.pause()
      return
    }
    this._trackIndex = this._nextTrackIndex
    this._playTrack()
  }

  /**
   * Play a playlist
   * @param  {Playlist} playlist
   * @param  {null|number=} autoPlayTrackID
   */
  async playPlaylist(playlist: Playlist, autoPlayTrackID?: null | number) {
    if (!playlist?.trackIds?.length) return
    this.trackListSource = {
      type: TrackListSourceType.PLAYLIST,
      id: playlist.id,
    }
    this.mode = Mode.PLAYLIST
    this.trackList = playlist.trackIds.map(t => t.id)
    this._trackIndex = autoPlayTrackID
      ? playlist.trackIds.findIndex(t => t.id === autoPlayTrackID)
      : 0
    this._playTrack()
  }

  /**
   * Play am album
   * @param  {Album} album
   * @param  {null|number=} autoPlayTrackID
   */
  async playAlbum(album: Album, autoPlayTrackID?: null | number) {
    console.log(album)
    if (!album?.songs?.length) return
    this.trackListSource = {
      type: TrackListSourceType.ALBUM,
      id: album.id,
    }
    this.mode = Mode.PLAYLIST
    this.trackList = album.songs.map(t => t.id)
    this._trackIndex = autoPlayTrackID
      ? album.songs.findIndex(t => t.id === autoPlayTrackID)
      : 0
    this._playTrack()
  }

  /**
   *  Play personal fm
   */
  async playFM() {
    this.mode = Mode.FM
    if (
      this.fmTrackList.length > 0 &&
      this._fmTrack?.id === this.fmTrackList[0]
    ) {
      this._track = this._fmTrack
      this._playAudio()
    } else {
      this._playTrack()
    }
  }

  /**
   * Init personal fm
   * should only be called in components/FMCard
   */
  async initFM() {
    if (this._fmInited) return
    const response = await fetchPersonalFMWithReactQuery()
    this.fmTrackList.push(...response?.data?.map(r => r.id))

    const trackId = this.fmTrackList[0]
    const track = await this._fetchTrack(trackId)
    if (track) this._fmTrack = track
    this._fmInited = true
  }

  /**
   * Trash current PersonalFMTrack
   */
  async fmTrash() {
    let trashId = this.fmTrackList.shift() ?? 0
    if (trashId === 0) return

    if (this.mode === Mode.FM) {
      await this._nextFMTrack()
    } else {
      for (let i = 0; i < 5 && this.fmTrackList.length <= 1; i++) {
        const response = await fetchPersonalFMWithReactQuery()
        this.fmTrackList.push(...response?.data?.map(r => r.id))
      }

      for (let i = 0; i < 5; i++) {
        let track = await this._fetchTrack(this.fmTrackList.at(0) ?? 0)
        if (track) {
          this._fmTrack = track
          break
        } else {
          this.fmTrackList.shift()
          if (this.fmTrackList.length <= 1) {
            const response = await fetchPersonalFMWithReactQuery()
            this.fmTrackList.push(...response?.data?.map(r => r.id))
          }
        }
      }
    }
    fmTrash(trashId)
  }

  /**
   * Play track in trackList by id
   */
  async playTrack(trackID: TrackID) {
    const index = this.trackList.findIndex(t => t === trackID)
    if (!index) toast('Failed to play: This track is not in the playlist')
    this._trackIndex = index
    this._playTrack()
  }
}

export const player = new Player()
