export interface EmulatedInfo {
  isLikelyEmulated: boolean;
  isDevToolsOpen: boolean;
}

export interface BrowserInfo {
  name: string;
  version: string;
  isIncognito: boolean;
  pixelRatio: number;
  zoomLevel: number;
  emulation: EmulatedInfo;
}
