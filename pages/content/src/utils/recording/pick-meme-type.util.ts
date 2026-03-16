export const pickMimeType = (): MediaRecorderOptions => {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return { mimeType: mime };
    }
  }

  return {}; // browser will decide
};
