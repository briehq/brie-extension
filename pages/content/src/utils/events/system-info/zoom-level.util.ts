/** Returns zoom level and device pixel ratio. */
export const getBrowserZoomLevel = () => {
  const pixelRatio = window.devicePixelRatio;
  const zoomLevel = Math.round((window.outerWidth / window.innerWidth) * 100);

  return { pixelRatio, zoomLevel };
};
