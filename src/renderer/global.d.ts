import { IpcChannels } from '@/main/IpcChannelsName'
import { ElectronLog } from 'electron-log'

export {}

declare global {
  interface Window {
    // Expose some Api through preload script
    ipcRenderer?: {
      sendSync: (channel: IpcChannels, ...args: any[]) => any
      send: (channel: IpcChannels, ...args: any[]) => void
      on: (
        channel: IpcChannels,
        listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void
      ) => void
    }
    env?: {
      isElectron: boolean
      isEnableTitlebar: boolean
      isLinux: boolean
      isMac: boolean
      isWin: boolean
    }
    log?: ElectronLog
  }
}

declare module 'valtio' {
  function useSnapshot<T extends object>(p: T): T
}
