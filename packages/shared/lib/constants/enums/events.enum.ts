export enum EventType {
  NAVIGATE = 'Navigate',
  DOM_CONTENT_LOADED = 'DOMContentLoaded',
  PAGE_LOADED = 'PageLoaded',
  TAB_HIDDEN = 'TabHidden',
  TAB_VISIBLE = 'TabVisible',
  INPUT_CHANGE = 'InputChange',
  SELECT_OPTION = 'SelectOption',
  RESIZE = 'Resize',
  CAPTURE = 'capture',
}

export enum CustomEventType {
  METADATA = 'metadata',
  CLOSE_MODAL = 'CLOSE_MODAL',
  DISPLAY_MODAL = 'DISPLAY_MODAL',
}

export enum EventDomain {
  SCREENSHOT = 'screenshot',
}

export enum NavigationMethod {
  PUSH_STATE = 'pushState',
  REPLACE_STATE = 'replaceState',
  POP_STATE = 'popstate',
}

export enum VisibilityState {
  HIDDEN = 'hidden',
  VISIBLE = 'visible',
}
