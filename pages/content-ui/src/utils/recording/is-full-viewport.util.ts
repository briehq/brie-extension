export const isAlmostFullViewport = (el: Element): boolean => {
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth || document.documentElement.clientWidth;
  const vh = window.innerHeight || document.documentElement.clientHeight;

  const widthRatio = rect.width / vw;
  const heightRatio = rect.height / vh;

  return widthRatio >= 0.9 && heightRatio >= 0.9;
};
