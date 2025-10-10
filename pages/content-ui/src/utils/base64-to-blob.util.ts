export const base64ToBlob = (data: string, type: string = 'image/png') => {
  const dataUrl = data.startsWith('data:') ? data.replace('data:image/jpeg;base64,', '') : data;

  // Decode base64 string
  const byteCharacters = atob(dataUrl);

  // Create byte array
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  // Convert byte array to Blob
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: type });
};
