// The line the band shows, or null before the first poll has finished.
export type BandLine = string | null

declare module 'claude-code' {
  interface PluginState {
    'harmony-remote': {
      line: BandLine
      // The theme setting's value, which picks the band's colour.
      theme: string
    }
  }
}
