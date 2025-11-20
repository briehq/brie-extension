/**
 * Runs a list of async jobs with a max concurrency limit.
 *
 * @param items - Array of input items.
 * @param limit - Max number of concurrent jobs.
 * @param worker - Async function that processes one item.
 *
 * @returns Promise<R[]> - Results in original order.
 */
export const limitConcurrency = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let i = 0;

  const run = async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  };

  const runners = new Array(Math.min(limit, items.length)).fill(0).map(run);
  await Promise.all(runners);
  return results;
};
