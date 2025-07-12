import { Control, controlsUtils } from 'fabric';

const rotateSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" strokeLinejoin="round" class="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`;

// Factory to create all controls with custom renderers
export const createDefaultControls = () => {
  const {
    scaleSkewCursorStyleHandler,
    scalingXOrSkewingY,
    scaleOrSkewActionName,
    scalingYOrSkewingX,
    scaleCursorStyleHandler,
    scalingEqually,
    rotationWithSnapping,
    rotationStyleHandler,
  } = controlsUtils;

  const defaultRender = (ctx, left, top, styleOverride, fabricObject) => {
    ctx.save();
    const size = 8;
    const radius = 2.5;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(left - size / 2 + radius, top - size / 2);
    ctx.lineTo(left + size / 2 - radius, top - size / 2);
    ctx.quadraticCurveTo(left + size / 2, top - size / 2, left + size / 2, top - size / 2 + radius);
    ctx.lineTo(left + size / 2, top + size / 2 - radius);
    ctx.quadraticCurveTo(left + size / 2, top + size / 2, left + size / 2 - radius, top + size / 2);
    ctx.lineTo(left - size / 2 + radius, top + size / 2);
    ctx.quadraticCurveTo(left - size / 2, top + size / 2, left - size / 2, top + size / 2 - radius);
    ctx.lineTo(left - size / 2, top - size / 2 + radius);
    ctx.quadraticCurveTo(left - size / 2, top - size / 2, left - size / 2 + radius, top - size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  };

  const newControls = {
    ml: new Control({
      x: -0.5,
      y: 0,
      cursorStyleHandler: scaleSkewCursorStyleHandler,
      actionHandler: scalingXOrSkewingY,
      getActionName: scaleOrSkewActionName,
      render: defaultRender,
    }),

    mr: new Control({
      x: 0.5,
      y: 0,
      cursorStyleHandler: scaleSkewCursorStyleHandler,
      actionHandler: scalingXOrSkewingY,
      getActionName: scaleOrSkewActionName,
      render: defaultRender,
    }),

    mb: new Control({
      x: 0,
      y: 0.5,
      cursorStyleHandler: scaleSkewCursorStyleHandler,
      actionHandler: scalingYOrSkewingX,
      getActionName: scaleOrSkewActionName,
      render: defaultRender,
    }),

    mt: new Control({
      x: 0,
      y: -0.5,
      cursorStyleHandler: scaleSkewCursorStyleHandler,
      actionHandler: scalingYOrSkewingX,
      getActionName: scaleOrSkewActionName,
      render: defaultRender,
    }),

    tl: new Control({
      x: -0.5,
      y: -0.5,
      cursorStyleHandler: scaleCursorStyleHandler,
      actionHandler: scalingEqually,
      render: defaultRender,
    }),

    tr: new Control({
      x: 0.5,
      y: -0.5,
      cursorStyleHandler: scaleCursorStyleHandler,
      actionHandler: scalingEqually,
      render: defaultRender,
    }),

    bl: new Control({
      x: -0.5,
      y: 0.5,
      cursorStyleHandler: scaleCursorStyleHandler,
      actionHandler: scalingEqually,
      render: defaultRender,
    }),

    br: new Control({
      x: 0.5,
      y: 0.5,
      cursorStyleHandler: scaleCursorStyleHandler,
      actionHandler: scalingEqually,
      render: defaultRender,
    }),

    mtr: new Control({
      x: 0,
      y: -0.5,
      offsetX: 0,
      offsetY: -25,
      actionHandler: rotationWithSnapping,
      cursorStyleHandler: rotationStyleHandler,
      withConnection: false,
      cursorStyle: 'grab',
      render: function (ctx, left, top, styleOverride, fabricObject) {
        ctx.save();
        const size = 16;
        const radius = size / 2;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(left, top, radius, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.stroke();

        const img = new Image();
        const imgSize = size - 6;
        img.onload = function () {
          ctx.drawImage(img, left - imgSize / 2, top - imgSize / 2, imgSize, imgSize);
        };
        img.src = 'data:image/svg+xml;base64,' + window.btoa(rotateSvg);

        ctx.restore();
      },
    }),
  };

  return newControls;
};
