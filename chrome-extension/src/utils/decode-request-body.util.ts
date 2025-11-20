export const decodeRequestBody = (requestBody?: {
  raw?: { bytes: ArrayBuffer }[];
}): { decoded: string; parsed: unknown } | null => {
  if (!requestBody?.raw?.length) return null;

  try {
    const rawBytes = requestBody.raw[0].bytes;
    const byteArray = new Uint8Array(rawBytes);
    const decoded = new TextDecoder('utf-8').decode(byteArray);

    let parsed: unknown = decoded;
    try {
      parsed = JSON.parse(decoded);
    } catch {
      // not JSON, keep as plain string
    }

    return { decoded, parsed };
  } catch (e) {
    console.warn('[decodeRequestBody] Failed to decode request body:', e);
    return null;
  }
};
