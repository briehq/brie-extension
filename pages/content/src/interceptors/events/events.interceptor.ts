import { AppEventType } from '@src/constants';
import type { ResizeHandler } from '@src/interfaces/events';
import {
  buildChord,
  closestForm,
  deepTarget,
  findClickableInPath,
  findSelectControlForOption,
  getAssociatedLabelText,
  getOptionText,
  getSystemInfo,
  isClickWithinToggle,
  isFnKey,
  isInteractive,
  isTextEntry,
  pathTouchesExtension,
  pickDefined,
  sendEvent,
} from '@src/utils';
import { isClickable } from '@src/utils/events/is-clickable.util';

import { historyApiInterceptor } from './history.interceptor';

const ENTER_SUBMIT_WINDOW_MS = 500;
const ACTIVATION_KEYS = new Set(['Enter', ' ']);
const pendingEnterSubmit = new WeakMap<HTMLFormElement, number>();

/**
 * Handles value-carrying element changes (input/select/textarea).
 * @param event - The DOM event.
 * @param reason - Why it fired: 'change' | 'blur' | 'input'.
 */
const handleOnValueChange = (event: Event, reason: 'change' | 'blur' | 'input') => {
  if (pathTouchesExtension(event)) return;

  const target = deepTarget(event);

  if (!(target instanceof HTMLElement)) return;

  const tag = target.tagName;
  const type = (target.getAttribute?.('type') || '').toLowerCase();

  // Native select
  if (tag === 'SELECT') {
    const value = (target as HTMLSelectElement).value ?? null;
    const controlLabel = getAssociatedLabelText(target);

    sendEvent(
      AppEventType.SelectChange,
      target,
      pickDefined({ value, source: 'native' as const, label: controlLabel }),
    );

    return;
  }

  // Checkbox/Radio: report checked & value
  if (tag === 'INPUT' && ['checkbox', 'radio'].includes(type)) {
    const el = target as HTMLInputElement;

    sendEvent(
      AppEventType.InputChange,
      el,
      pickDefined({ inputType: type, checked: el.checked, value: el.value || null, reason }),
    );

    return;
  }

  // Textual inputs/textarea on blur/change to avoid noise (input reason emits live if needed)
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
    const el = target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const value = (el as HTMLInputElement).value ?? (el as HTMLTextAreaElement).value ?? null;
    const size = (el as HTMLInputElement).size || null;

    sendEvent(AppEventType.InputChange, el, pickDefined({ inputType: type || tag.toLowerCase(), value, size, reason }));
  }
};

/**
 * Handles clicks on custom select options (e.g., role=option/menuitem).
 * @param event - Mouse click event.
 */
const handleOnCustomSelectClick = (event: MouseEvent) => {
  if (pathTouchesExtension(event)) return;

  const target = deepTarget(event);

  if (!target) return;

  const role = (target as HTMLElement).getAttribute?.('role')?.toLowerCase();

  if (role === 'option' || role === 'menuitem' || role === 'listitem') {
    const value = getOptionText(target as HTMLElement);
    const control = findSelectControlForOption(target);
    const controlLabel = control ? getAssociatedLabelText(control) : getAssociatedLabelText(target);

    sendEvent(
      AppEventType.SelectChange,
      target, // control ?? target
      pickDefined({
        value,
        source: 'custom',
        label: controlLabel,
      }),
    );
  }
};

/**
 * Handles mouse clicks using capture phase and composed path.
 * @param event - Mouse click event.
 */
const handleOnClick = (event: MouseEvent) => {
  if (pathTouchesExtension(event)) return;

  const ep = document.elementFromPoint(event.clientX, event.clientY);
  const hitTarget = ep instanceof Element ? ep : deepTarget(event);

  if (!hitTarget) return;

  const role = (hitTarget as HTMLElement).getAttribute?.('role')?.toLowerCase();
  const tag = hitTarget.tagName;

  /**
   * Ignore clicks inside native selects and ARIA listboxes/comboboxes;
   * these are handled by change/option-click handlers below.
   */
  if (tag === 'SELECT' || role === 'option' || role === 'listbox' || role === 'combobox') return;
  if (isClickWithinToggle(hitTarget, event)) return;

  if (isTextEntry(hitTarget)) return;

  if (!isInteractive(hitTarget)) return;

  const clickable = findClickableInPath(event);
  const finalTarget = clickable && isInteractive(clickable) ? clickable : hitTarget;

  sendEvent(AppEventType.MouseClick, finalTarget);
};

/**
 * Handles clicks on ARIA toggles (role=checkbox|radio|switch).
 * Emits a single InputChange with inferred checked state.
 */
const handleOnAriaToggleClick = (event: MouseEvent) => {
  if (pathTouchesExtension(event)) return;
  const t = deepTarget(event);
  if (!(t instanceof HTMLElement)) return;

  const role = t.getAttribute('role')?.toLowerCase();
  if (!role || !['checkbox', 'radio', 'switch'].includes(role)) return;

  const aria = t.getAttribute('aria-checked');
  const current = aria === 'true' ? true : aria === 'false' ? false : undefined;
  const next = current === undefined ? true : !current;

  sendEvent(AppEventType.InputChange, t, {
    inputType: role,
    checked: next,
    value: (t.getAttribute('data-value') || t.getAttribute('aria-label') || t.innerText || '').trim() || null,
    reason: 'click',
  });
};

/**
 * Handles keyboard shortcuts and key-based activations (Enter/Space).
 * - No KeyActivation for Tab or Space while typing.
 * - Shortcuts emit only once per chord (ignores bare modifiers).
 * - Enter inside a FORM defers to FormSubmit (no KeyActivation).
 *
 * @param event - Submit event.
 */
const handleOnKeydown = (event: KeyboardEvent) => {
  if (pathTouchesExtension(event)) return;

  const active = (document.activeElement as Element) ?? deepTarget(event);

  if (event.key === 'Tab') return;

  if (event.ctrlKey || event.metaKey || event.altKey || isFnKey(event.key)) {
    const chord = buildChord(event);

    if (chord) {
      sendEvent(AppEventType.KeyboardShortcut, active ?? null, { keys: chord });
    }

    return;
  }

  if (!ACTIVATION_KEYS.has(event.key)) return;

  if (event.key === ' ' && isTextEntry(active)) return;

  if (event.key === 'Enter' && active && isClickable(active)) {
    sendEvent(AppEventType.KeyActivation, active, { keys: 'Enter' });

    return;
  }

  if (event.key === 'Enter' && active && isTextEntry(active)) {
    const hasNewlineModifier = event.shiftKey || event.altKey || event.ctrlKey || event.metaKey;
    const form = closestForm(active);

    if (!hasNewlineModifier && form) {
      pendingEnterSubmit.set(form, Date.now());
      return;
    }

    const action = hasNewlineModifier ? 'newline' : 'submit';
    sendEvent(AppEventType.KeyActivation, active, { keys: 'Enter', isTextEntry: true, action });

    return;
  }

  if (event.key === ' ' && active && isClickable(active)) {
    sendEvent(AppEventType.KeyActivation, active, { keys: 'Space' });
  }
};

/**
 * Handles form submission events and emits a single FormSubmit.
 * - Suppresses duplicate KeyActivation events triggered by Enter inside forms.
 * - Captures action/method metadata from the form element.
 *
 * @param event - Submit event.
 */
const handleOnSubmit = (event: Event) => {
  if (pathTouchesExtension(event)) return;

  // Find the form element from the composed path (handles shadow DOM)
  const path = (event.composedPath?.() ?? []) as EventTarget[];
  const form = path.find(n => n instanceof HTMLFormElement) as HTMLFormElement | null;

  // Fallback: use the event target if no form found
  const el = form ?? (deepTarget(event) as Element | null);
  if (!el) return;

  // If this was triggered by pressing Enter in a text input,
  // and we recorded a pending KeyActivation recently → suppress it.
  if (form) {
    const ts = pendingEnterSubmit.get(form);
    if (ts && Date.now() - ts <= ENTER_SUBMIT_WINDOW_MS) {
      pendingEnterSubmit.delete(form);
    }
  }

  // Capture useful form metadata (if available)
  const extra = form
    ? {
        action: form.action || null,
        method: (form.method || '').toUpperCase() || null,
      }
    : undefined;

  sendEvent(AppEventType.FormSubmit, el, extra);
};

/**
 * Collects system metadata and emits a metadata event.
 * @returns Promise that resolves after metadata is sent.
 */
const handleOnMetadata = async () => {
  const systemInfo = await getSystemInfo().catch(() => ({}));

  sendEvent(
    AppEventType.Metadata,
    null,
    pickDefined({
      url: location.href,
      rawTimestamp: new Date().toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      window: { width: window.innerWidth, height: window.innerHeight },
      screen: { width: window.screen.width, height: window.screen.height },
      ...systemInfo,
    }),
  );
};

/**
 * Creates a visibilitychange handler that tracks hidden/visible and time away of opened tabs.
 * @returns A function to call on each visibilitychange.
 */
const createTabVisibilityHandler = () => {
  let hiddenAt: number | null = null;

  return () => {
    const now = Date.now();

    if (document.visibilityState === 'hidden') {
      hiddenAt = now;

      sendEvent(AppEventType.TabHidden);
    } else if (document.visibilityState === 'visible') {
      const timeAwayMs = hiddenAt ? now - hiddenAt : null;
      hiddenAt = null;

      sendEvent(AppEventType.TabVisible, null, pickDefined({ timeAwayMs }));
    }
  };
};

/**
 * Creates a debounced resize handler that emits a single event per resize activity.
 *
 * - Fires once after the user stops resizing the window (trailing debounce).
 * - Suppresses duplicate emissions if the final size matches the last emitted size.
 * - Provides `.flush()` to emit immediately and `.cancel()` to clear pending timers.
 *
 * @param idleMs - The debounce delay in milliseconds (default: 1000ms).
 * @returns A resize handler function with `flush()` and `cancel()` helpers attached.
 */
const createResizeOncePerActivity = (idleMs = 1000): ResizeHandler => {
  let t: ReturnType<typeof setTimeout> | null = null;
  let pendingW = window.innerWidth;
  let pendingH = window.innerHeight;
  let lastEmittedW = window.innerWidth;
  let lastEmittedH = window.innerHeight;

  const emitIfChanged = () => {
    if (pendingW !== lastEmittedW || pendingH !== lastEmittedH) {
      lastEmittedW = pendingW;
      lastEmittedH = pendingH;
      sendEvent(AppEventType.Resize, null, { size: { width: lastEmittedW, height: lastEmittedH } });
    }
  };

  const handler = ((_: UIEvent) => {
    pendingW = window.innerWidth;
    pendingH = window.innerHeight;

    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      emitIfChanged();
    }, idleMs);
  }) as ResizeHandler;

  handler.flush = () => {
    if (t) {
      clearTimeout(t);
      t = null;
      emitIfChanged();
    }
  };

  handler.cancel = () => {
    if (t) {
      clearTimeout(t);
      t = null;
    }
  };

  return handler;
};

/**
 * Initializes all capture-phase listeners and starts event interception.
 */
export const interceptEvents = () => {
  // Lifecycle
  document.addEventListener('DOMContentLoaded', () => sendEvent(AppEventType.DOMContentLoaded), {
    capture: true,
    passive: true,
  });
  window.addEventListener('load', () => sendEvent(AppEventType.PageLoaded), { capture: true, passive: true });

  // Resize
  const onResize = createResizeOncePerActivity(1500);
  window.addEventListener('resize', onResize, { capture: true, passive: true });
  window.addEventListener('orientationchange', () => onResize.flush(), { capture: true, passive: true });

  // Visibility
  const handleOnTabVisibilityChange = createTabVisibilityHandler();
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'hidden') onResize.flush();

      handleOnTabVisibilityChange();
    },
    { capture: true, passive: true },
  );

  // Inputs / selects changes
  document.addEventListener('change', e => handleOnValueChange(e, 'change'), { capture: true });

  // Clicks and custom selects
  document.addEventListener('click', handleOnClick, { capture: true });
  document.addEventListener('click', handleOnCustomSelectClick, { capture: true });
  document.addEventListener('click', handleOnAriaToggleClick, { capture: true });

  // Keyboard
  document.addEventListener('keydown', handleOnKeydown, { capture: true });

  // Submit
  document.addEventListener('submit', handleOnSubmit, { capture: true });

  // Custom metadata event
  window.addEventListener('metadata', handleOnMetadata as EventListener, { capture: true });

  // History
  historyApiInterceptor();

  // Media
  const mediaEvents: Array<keyof HTMLMediaElementEventMap> = ['play', 'pause', 'volumechange'];

  for (const event of mediaEvents) {
    document.addEventListener(
      event,
      (e: Event) => {
        const target = e.target as HTMLMediaElement | null;

        if (!target) return;

        sendEvent(AppEventType.MouseClick, target, {
          mediaEvent: event,
          currentTime: target.currentTime,
          paused: target.paused,
          muted: target.muted,
          volume: target.volume,
        });
      },
      { capture: true, passive: true },
    );
  }
};
