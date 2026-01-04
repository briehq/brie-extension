export const isInsideShadowDom = (el: Element | null): boolean => {
  if (!el) return false;

  const node = el as HTMLElement;

  if (node.id === 'brie-root') return true;

  if (node.closest('#brie-root')) return true;

  if (node.closest('[data-brie-toolbar="true"]')) return true;

  return false;
};
