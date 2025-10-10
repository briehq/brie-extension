import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const getShadowRoot = () => {
  const shadowHost = document.querySelector('#brie-root');
  const shadowRoot = shadowHost?.shadowRoot?.getElementById('brie-content');

  if (!shadowRoot) console.log('No Shadow Root');

  return shadowRoot;
};
