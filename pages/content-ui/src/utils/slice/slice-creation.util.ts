import type { InitSliceRequest, InitSliceResponse } from '@extension/shared';
import type { AppDispatch } from '@extension/store';
import { slicesPrivateAPI } from '@extension/store/lib/store/slices';

interface RunSliceFlowParams {
  dispatch: AppDispatch;
  payload: InitSliceRequest;
  idempotencyKey: string;
  files: {
    screenshots: File[];
    attachments: File[];
    records?: File;
    annotations?: File;
  };
  onProgress?: (progress: number) => void;
  concurrency?: number; // default: 4
}

type UploadItem = {
  assetId: string;
  sliceId: string;
  file: File;
  kind: 'screenshot' | 'attachment' | 'records' | 'annotations';
  index?: number;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/**
 * Create or restore a draft slice (idempotent via header).
 * Ensures the RTK Query subscription is always unsubscribed.
 *
 * @param dispatch - Redux dispatch
 * @param payload - Draft creation payload
 * @param idempotencyKey - Idempotency key for server-side dedupe
 *
 * @returns Promise<InitSliceResponse>
 */
const createDraftSlice = async (
  dispatch: AppDispatch,
  payload: InitSliceRequest,
  idempotencyKey: string,
): Promise<InitSliceResponse> => {
  return await dispatch(
    slicesPrivateAPI.endpoints.createDraftSlice.initiate({
      body: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  ).unwrap();
};

/**
 * Upload one asset file and unsubscribe the RTK Query subscription.
 *
 * @param dispatch - Redux dispatch
 * @param sliceId - Slice ID
 * @param assetId - Server-issued asset ID
 * @param file - File to upload
 */
const uploadAssetOnce = async (dispatch: AppDispatch, sliceId: string, assetId: string, file: File): Promise<void> => {
  await dispatch(slicesPrivateAPI.endpoints.uploadAssetBySliceId.initiate({ sliceId, assetId, file })).unwrap();
};

/**
 * Retry helper with capped backoff.
 *
 * @param fn - Async function to execute
 * @param opts - Retry options
 *
 * @returns Promise<T>
 */
const withRetry = async <T>(
  fn: () => Promise<T>,
  { retries = 2, baseMs = 250 }: { retries?: number; baseMs?: number } = {},
): Promise<T> => {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      if (attempt > retries) throw e;
      const delay = Math.min(baseMs * 2 ** (attempt - 1), 1500);
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

/**
 * Build the upload queue for assets that are not yet uploaded.
 *
 * @param draft - Draft slice returned by server
 * @param files - Local files to upload
 *
 * @returns UploadItem[]
 */
const buildUploadQueue = (draft: InitSliceResponse, files: RunSliceFlowParams['files']): UploadItem[] => {
  const q: UploadItem[] = [];

  draft.assets.screenshots.forEach((asset, i) => {
    const f = files.screenshots[i];
    if (!asset) return;
    if (!asset.uploaded && asset.id && f instanceof File) {
      q.push({ assetId: asset.id, sliceId: draft.id, file: f, kind: 'screenshot', index: i });
    }
  });

  (draft.assets.attachments ?? []).forEach((asset, i) => {
    const f = files.attachments[i];
    if (!asset) return;
    if (!asset.uploaded && asset.id && f instanceof File) {
      q.push({ assetId: asset.id, sliceId: draft.id, file: f, kind: 'attachment', index: i });
    }
  });

  if (draft.assets.records?.id && !draft.assets.records.uploaded && files.records) {
    q.push({ assetId: draft.assets.records.id, sliceId: draft.id, file: files.records, kind: 'records' });
  }

  if (draft.assets.annotations?.id && !draft.assets.annotations.uploaded && files.annotations) {
    q.push({ assetId: draft.assets.annotations.id, sliceId: draft.id, file: files.annotations, kind: 'annotations' });
  }

  return q;
};

/**
 * Upload all queue items with bounded concurrency and progress reporting.
 *
 * @param dispatch - Redux dispatch
 * @param items - Upload items
 * @param onProgress - Progress callback (0..100)
 * @param concurrency - Parallel uploads (1..8)
 *
 * @returns Promise<number> - Count of successful uploads
 */
const runUploads = async (
  dispatch: AppDispatch,
  items: UploadItem[],
  onProgress?: (n: number) => void,
  concurrency = 4,
): Promise<number> => {
  const total = items.length;

  if (total === 0) {
    onProgress?.(100);
    return 0;
  }

  let done = 0;
  const queue = [...items];
  const limit = clamp(concurrency, 1, 8);

  const worker = async () => {
    while (queue.length) {
      const item = queue.shift()!;
      await withRetry(() => uploadAssetOnce(dispatch, item.sliceId, item.assetId, item.file), {
        retries: 2,
        baseMs: 300,
      });
      done += 1;
      onProgress?.(Math.round((done / total) * 100));
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, total) }, worker));

  return done;
};

/**
 * Orchestrate draft creation and asset uploads.
 * - Idempotent draft via header
 * - Bounded concurrency uploads with retry and progress
 *
 * @param params - RunSliceFlowParams
 *
 * @returns Promise<{ draft: InitSliceResponse; uploaded: boolean }>
 */
export const runSliceCreationFlow = async ({
  dispatch,
  payload,
  idempotencyKey,
  files,
  onProgress,
  concurrency = 4,
}: RunSliceFlowParams): Promise<{ draft: InitSliceResponse; uploaded: boolean }> => {
  console.log?.('CREATE_DRAFT:begin');
  const draft = await createDraftSlice(dispatch, payload, idempotencyKey);
  console.log?.('CREATE_DRAFT:end', draft.id);
  const uploadItems = buildUploadQueue(draft, files);
  console.log?.('UPLOADS:begin', uploadItems.length);
  const uploadedCount = await runUploads(dispatch, uploadItems, onProgress, concurrency);
  console.log?.('UPLOADS:end', uploadedCount);
  const uploaded = uploadItems.length === 0 || uploadedCount === uploadItems.length;

  if (uploadItems.length > 0) onProgress?.(100);

  return { draft, uploaded };
};
