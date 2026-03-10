export type Theme = 'light' | 'dark' | 'system'

export type Language = 'en' | 'tr'

declare global {
  interface Window {
    __APP_SETTINGS__?: {
      lang: Language
      theme: Theme
      timeZone: string
      timeZoneSource?: 'profile' | 'request'
    }
  }
}

export interface AppSettings {
  lang: Language
  theme: Theme
  sidebarOpen: boolean
  timeZone: string
  timeZoneSource?: 'profile' | 'request'
}
