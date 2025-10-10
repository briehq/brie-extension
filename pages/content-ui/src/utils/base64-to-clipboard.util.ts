import { base64ToBlob } from './base64-to-blob.util';

export const copyBase64ImageToClipboard = async (b64: string) => {
  if (!('clipboard' in navigator) || typeof ClipboardItem === 'undefined') {
    throw new Error('Clipboard images are not supported in this browser.');
  }

  const blob = await base64ToBlob(b64);
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
};
