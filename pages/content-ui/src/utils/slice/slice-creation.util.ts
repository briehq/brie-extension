import type { InitSliceRequest, InitSliceResponse } from '@extension/shared';
import type { AppDispatch } from '@extension/store';
import { slicesPrivateAPI } from '@extension/store/lib/store/slices';

interface RunSliceFlowParams {
  dispatch: AppDispatch;
  onProgress?: (progress: number) => void;
  concurrency?: number;
  payload: InitSliceRequest;
  idempotencyKey: string;
  files: {
    screenshots: File[];
    attachments: File[];
    records?: File;
    annotations?: File;
  };
}

type UploadItem = { assetId: string; sliceId: string; file: File };

export const runSliceCreationFlow = async ({
  dispatch,
  payload,
  idempotencyKey,
  files,
  onProgress,
  concurrency = 4,
}: RunSliceFlowParams): Promise<{ draft: InitSliceResponse; uploaded: boolean }> => {
  const draft = await dispatch(
    slicesPrivateAPI.endpoints.createDraftSlice.initiate({
      body: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  ).unwrap();

  const uploadItems: UploadItem[] = [];

  const addToQueue = (asset: { id: string; uploaded: boolean } | undefined, file: File | undefined) => {
    if (!asset?.uploaded && asset?.id && file) {
      uploadItems.push({ assetId: asset.id, sliceId: draft.id, file });
    }
  };

  draft.assets.screenshots.forEach((asset, i) => addToQueue(asset, files.screenshots[i]));
  draft.assets.attachments?.forEach((asset, i) => addToQueue(asset, files.attachments[i]));

  addToQueue(draft.assets.records, files.records);
  addToQueue(draft.assets.annotations, files.annotations);

  const total = uploadItems.length;
  let done = 0;
  if (total === 0) onProgress?.(100);

  const uploadWorker = async (item: UploadItem) => {
    await dispatch(
      slicesPrivateAPI.endpoints.uploadAssetBySliceId.initiate({
        sliceId: item.sliceId,
        assetId: item.assetId,
        file: item.file,
      }),
    ).unwrap();
    done += 1;
    onProgress?.(Math.round((done / total) * 100));
  };

  if (uploadItems.length) {
    const queue = [...uploadItems];
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length) await uploadWorker(queue.shift()!);
    });

    await Promise.all(workers);
  }

  return { draft, uploaded: total === 0 || done === total };
};
