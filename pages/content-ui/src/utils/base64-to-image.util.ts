import { saveAs } from 'file-saver';

import { base64ToBlob } from './base64-to-blob.util';

export const saveBase64Image = async (b64: string, filename = 'image.png') => {
  const blob = await base64ToBlob(b64);
  saveAs(blob, `${filename}.png`);
};
