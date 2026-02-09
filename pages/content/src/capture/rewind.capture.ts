/* eslint-disable import-x/exports-last */
import { record } from 'rrweb';

import { isRewindBlocked } from '@extension/shared';
import { rewindSettingsStorage } from '@extension/storage';

type RrwebStopFunction = () => void;

const MAX_BATCH_EVENTS = 200;
const FLUSH_INTERVAL_MS = 250;
const URL_WATCH_INTERVAL_MS = 500;

const RRWEB_META_EVENT_TYPE = 4;
const RRWEB_FULL_SNAPSHOT_EVENT_TYPE = 2;

type BlockState = { blocked: boolean; reason?: string };
type CapturePolicy = { allowed: boolean; reason?: string; url: string };

let rrwebStopFunction: RrwebStopFunction | null = null;

let isRewindGloballyEnabled = false;
let isCaptureAllowedForUrl = false;
let lastKnownUrl = window.location.href;

const pendingEvents: unknown[] = [];
let flushTimerId: ReturnType<typeof setTimeout> | null = null;

const isRestrictedScheme = (url: string): boolean =>
  url.startsWith('chrome://') ||
  url.startsWith('edge://') ||
  url.startsWith('about:') ||
  url.startsWith('chrome-extension://');

const getEventType = (eventPayload: unknown): number | null => {
  const typeValue = (eventPayload as any)?.type;
  return typeof typeValue === 'number' ? typeValue : null;
};

const clearFlushTimer = (): void => {
  if (!flushTimerId) return;
  clearTimeout(flushTimerId);
  flushTimerId = null;
};

const flushPendingEvents = (): void => {
  if (!isRewindGloballyEnabled || !isCaptureAllowedForUrl) return;
  if (pendingEvents.length === 0) return;

  const batch = pendingEvents.splice(0, pendingEvents.length);

  try {
    chrome.runtime.sendMessage({
      type: 'REWIND/EVENT_BATCH',
      events: batch,
      t0: Date.now(),
    });
  } catch {
    // If sending fails, we already popped the batch.
    // If you want *zero loss*, keep a retry buffer here.
  } finally {
    clearFlushTimer();
  }
};

const scheduleFlush = (): void => {
  if (flushTimerId) return;
  flushTimerId = setTimeout(flushPendingEvents, FLUSH_INTERVAL_MS);
};

const stopCaptureInternal = (): void => {
  // CRITICAL: flush what we have before clearing
  flushPendingEvents();

  if (!rrwebStopFunction) {
    pendingEvents.length = 0;
    clearFlushTimer();
    return;
  }

  try {
    rrwebStopFunction();
  } finally {
    rrwebStopFunction = null;
    flushPendingEvents(); // flush anything enqueued during stop
    pendingEvents.length = 0;
    clearFlushTimer();
  }
};

const sendBlockedSignal = (blockState: BlockState, url: string): void => {
  if (!blockState.blocked) return;
  try {
    chrome.runtime.sendMessage({ type: 'REWIND/BLOCKED', reason: blockState.reason, url });
  } catch {
    //
  }
};

const getDenylistBlockState = (url: string): BlockState => {
  try {
    const result = isRewindBlocked(url);
    return { blocked: Boolean(result.blocked), reason: result.reason };
  } catch {
    return { blocked: false };
  }
};

const isHostDisabledByUser = async (url: string): Promise<boolean> => {
  try {
    const host = new URL(url).host.toLowerCase();
    return await rewindSettingsStorage.isHostDisabled(host);
  } catch {
    return false;
  }
};

const computeCapturePolicy = async (url: string): Promise<CapturePolicy> => {
  if (!isRewindGloballyEnabled) return { allowed: false, reason: 'rewind-disabled', url };
  if (isRestrictedScheme(url)) return { allowed: false, reason: 'restricted-scheme', url };

  const denylistState = getDenylistBlockState(url);
  if (denylistState.blocked) return { allowed: false, reason: denylistState.reason ?? 'blocked', url };

  const disabledByHost = await isHostDisabledByUser(url);
  if (disabledByHost) return { allowed: false, reason: 'host-disabled', url };

  return { allowed: true, url };
};

const enqueueEvent = (eventPayload: unknown): void => {
  if (!isRewindGloballyEnabled || !isCaptureAllowedForUrl) return;

  pendingEvents.push(eventPayload);

  const rrwebType = getEventType(eventPayload);

  // CRITICAL: never delay META or FULL SNAPSHOT. Flush immediately.
  if (rrwebType === RRWEB_META_EVENT_TYPE || rrwebType === RRWEB_FULL_SNAPSHOT_EVENT_TYPE) {
    flushPendingEvents();
    return;
  }

  if (pendingEvents.length >= MAX_BATCH_EVENTS) {
    flushPendingEvents();
    return;
  }

  scheduleFlush();
};

export const startRewindCapture = (): void => {
  if (!isRewindGloballyEnabled || !isCaptureAllowedForUrl) return;
  if (rrwebStopFunction) return;

  rrwebStopFunction = record({
    emit: enqueueEvent,
    maskAllInputs: false,
    recordCanvas: false,
    inlineStylesheet: true,
    collectFonts: true,
    checkoutEveryNms: 30 * 1000,
    sampling: { mousemove: 50, scroll: 150 },
  });
};

export const stopRewindCapture = (): void => {
  stopCaptureInternal();
};

const applyPolicy = async (url: string): Promise<CapturePolicy> => {
  const policy = await computeCapturePolicy(url);
  isCaptureAllowedForUrl = policy.allowed;

  if (!policy.allowed) {
    stopCaptureInternal();

    const denylistState = getDenylistBlockState(url);
    if (denylistState.blocked) sendBlockedSignal(denylistState, url);

    return policy;
  }

  startRewindCapture();
  return policy;
};

export const applyEnabledState = async (enabled: boolean): Promise<void> => {
  isRewindGloballyEnabled = enabled;

  if (!isRewindGloballyEnabled) {
    stopCaptureInternal();
    return;
  }

  await applyPolicy(window.location.href);
};

export const restartRewindCapture = async (): Promise<{ ok: boolean; reason?: string }> => {
  // Force a new session boundary
  stopCaptureInternal();

  const url = window.location.href;
  lastKnownUrl = url;

  const policy = await applyPolicy(url);
  if (!policy.allowed) return { ok: false, reason: policy.reason };

  return { ok: true };
};

const startUrlWatcher = (): void => {
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl === lastKnownUrl) return;
    lastKnownUrl = currentUrl;
    void applyPolicy(currentUrl);
  }, URL_WATCH_INTERVAL_MS);
};

const bootstrap = async (): Promise<void> => {
  isRewindGloballyEnabled = await rewindSettingsStorage.isRewindEnabled();
  await applyPolicy(window.location.href);
  startUrlWatcher();
};

bootstrap();
