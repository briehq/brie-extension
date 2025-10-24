export type ResizeHandler = ((e: UIEvent) => void) & { flush: () => void; cancel: () => void };
