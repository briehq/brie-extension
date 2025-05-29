import { safePostMessage } from '@extension/shared';

import {
  findClickableParent,
  getElementDescription,
  getSystemInfo,
  isClickableElement,
  shouldSkipClick,
  shouldSkipInputTracking,
} from '@src/utils';
import { historyApiInterceptor } from './history.interceptor';

/**
 * @todo
 * move logic outside, leave just the Event Listeners
 */
export const trackEvent = ({ target, ...others }: any) => {
  const description = target ? getElementDescription(target) : null;
  const baseTimestamp = Date.now();
  const timestamp = others?.event === 'Navigate' ? baseTimestamp + 1000 : baseTimestamp;

  safePostMessage('ADD_RECORD', {
    type: 'event',
    recordType: 'events',
    source: 'client',
    timestamp,
    ...others,
    ...(description ? { description } : {}),
    ...(target?.tagName ? { tagName: target?.tagName } : {}),
    ...(target?.event ? { event: target?.event } : {}),
    ...(target?.url ? { url: target?.url } : {}),
    ...(target?.id ? { id: target?.id } : {}),
    ...(target?.className ? { className: target?.className } : {}),
    ...(target?.href ? { href: target?.href } : {}),
    ...(target?.role ? { role: target?.role } : {}),
    ...(target?.value ? { value: target?.value } : {}),
    ...(target?.size ? { size: target?.size } : {}),
    ...(target?.action ? { action: target?.action } : {}),
    ...(target?.method ? { method: target?.method } : {}),
    ...(target?.disabled ? { disabled: target?.disabled } : {}),
    ...(target && target['data-testid'] ? { dataTestid: target['data-testid'] } : {}),
    ...(target && target['dataTestid'] ? { dataTestid: target['dataTestid'] } : {}),
    ...(target && target['aria-label'] ? { ariaLabel: target['aria-label'] } : {}),
    ...(target && target['ariaLabel'] ? { ariaLabel: target['ariaLabel'] } : {}),
    ...(target instanceof HTMLElement && target.getAttribute('aria-label')
      ? { ariaLabel: target.getAttribute('aria-label') }
      : {}),
    ...(target instanceof HTMLElement && target.getAttribute('aria-label')
      ? { dataLabel: target.getAttribute('data-label') }
      : {}),
    ...(target instanceof HTMLElement && target.getAttribute('aria-label')
      ? { name: target.getAttribute('name') }
      : {}),
    ...(target && target['aria-describedby'] ? { ariaDescribedby: target['aria-describedby'] } : {}),
    ...(target && target['ariaDescribedby'] ? { ariaDescribedby: target['ariaDescribedby'] } : {}),
    ...(target && target['contenteditable'] ? { contentEditable: target['contenteditable'] } : {}),
    ...(target?.label ? { label: target?.label } : {}),
    ...(target?.role ? { role: target?.role } : {}),
    ...(target?.title ? { title: target?.title } : {}),
    ...(target?.target ? { target: target?.target } : {}),
    ...(target?.type ? { inputType: target?.type } : {}),
    ...(target?.textContent ? { textContent: target?.textContent?.trim() } : {}),
  });
};

const handleSelectChange = (target: HTMLElement, source: 'native' | 'custom') => {
  const value =
    (target as HTMLSelectElement)?.value ||
    target?.getAttribute('data-value') ||
    target?.textContent?.trim() ||
    undefined;

  trackEvent({
    event: 'SelectOption',
    source,
    value,
    url: window.location.href,
    target,
  });
};

export const interceptEvents = () => {
  let interactionStarted = false;

  // Activate tracking only after the user interacts with the page
  const activateTracking = () => {
    if (interactionStarted) return;

    interactionStarted = true;
  };

  const trackClickEvent = (target, activationMethod) => {
    trackEvent({
      event: activationMethod,
      url: window.location.href,
      target,
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    trackEvent({ event: 'DOMContentLoaded', url: window.location.href });
  });

  window.addEventListener('load', async () => {
    trackEvent({ event: 'PageLoaded' });
  });

  let hiddenAt: number | null = null;

  document.addEventListener('visibilitychange', () => {
    const now = Date.now();

    if (document.visibilityState === 'hidden') {
      hiddenAt = now;
      trackEvent({ event: 'TabHidden', timestamp: now, url: window.location.href });
    } else if (document.visibilityState === 'visible') {
      const timeAway = hiddenAt ? now - hiddenAt : null;
      hiddenAt = null;

      trackEvent({
        event: 'TabVisible',
        timestamp: now,
        url: window.location.href,
        ...(timeAway ? { timeAwayMs: timeAway } : {}),
      });
    }
  });

  document.addEventListener('change', ({ target }) => {
    if (!interactionStarted || !(target instanceof HTMLElement)) return;

    const tagName = target.tagName;
    const inputType = target.getAttribute('type')?.toLowerCase() || '';

    if (tagName === 'SELECT') {
      handleSelectChange(target, 'native');
      return;
    }

    if (tagName === 'INPUT') {
      if (shouldSkipInputTracking(target)) return;

      if (['checkbox', 'radio'].includes(inputType)) {
        trackEvent({
          event: 'InputChange',
          inputType,
          value: (target as HTMLSelectElement).value,
          checked: (target as HTMLInputElement).checked,
          url: window.location.href,
          target,
        });
      }
    }
  });

  window.addEventListener('resize', () => {
    trackEvent({ event: 'Resize', size: { width: window.innerWidth, height: window.innerHeight } });
  });

  document.addEventListener('keydown', event => {
    activateTracking();

    const target = document.activeElement;

    if (!target?.tagName) return;

    if (['Enter', ' '].includes(event.key)) {
      if (isClickableElement(target as HTMLElement)) {
        // event.preventDefault(); // Prevent default spacebar scroll behavior
        trackClickEvent(target, 'KeyActivation');
      }
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      trackEvent({
        event: 'KeyboardShortcut',
        keys: [event.ctrlKey && 'Ctrl', event.metaKey && 'Meta', event.altKey && 'Alt', event.key]
          .filter(Boolean)
          .join('+'),
        url: window.location.href,
        target: document.activeElement,
      });
    }
  });

  document.addEventListener('click', event => {
    activateTracking();

    const target = event.target as HTMLElement;
    if (!target || shouldSkipClick(target)) return;

    const role = target.getAttribute('role');
    if (role === 'option') {
      handleSelectChange(target, 'custom');
      return;
    }

    const clickable = isClickableElement(target) ? target : findClickableParent(target);

    if (clickable && isClickableElement(clickable)) {
      trackClickEvent(clickable, 'MouseClick');
    }
  });

  document.addEventListener('submit', event => {
    activateTracking();

    trackEvent({
      event: 'FormSubmit',
      url: window.location.href,
      target: event,
    });
  });

  document.addEventListener(
    'blur',
    ({ target }) => {
      if (!interactionStarted || !(target instanceof HTMLElement)) return;

      const tagName = target.tagName;
      const inputType = target?.getAttribute('type')?.toLowerCase() || '';

      if (shouldSkipInputTracking(target)) return;

      if (['INPUT', 'TEXTAREA'].includes(tagName)) {
        trackEvent({
          event: 'InputChange',
          inputType,
          value: (target as HTMLInputElement).value || '',
          url: window.location.href,
          target,
        });
      }
    },
    true,
  );

  document.addEventListener('mousedown', activateTracking);
  document.addEventListener('focusin', activateTracking, true);

  // Custom Events
  window.addEventListener('metadata', async () => {
    const systemInfo = await getSystemInfo();

    trackEvent({
      event: 'metadata',
      rawTimestamp: new Date().toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      url: document.location.href,
      window: { width: window.innerWidth, height: window.innerHeight },
      screen: { width: window.screen.width, height: window.screen.height },
      ...systemInfo,
    });
  });

  historyApiInterceptor();
};
