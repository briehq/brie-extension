import { useEffect, useMemo } from 'react';

import { useGetSlicesQuery } from '@extension/store';

export const useSlicesCreatedToday = (): number => {
  const {
    isLoading,
    isError,
    data: slices,
  } = useGetSlicesQuery(
    { limit: 1, take: 10 },
    // {
    //   refetchOnMountOrArgChange: true,
    //   refetchOnReconnect: true,
    //   refetchOnFocus: true,
    //   pollingInterval: 0, // or set to something like 10_000 to poll every 10s
    //   skip: false,
    // },
  );

  console.log('slices', slices);

  return useMemo(() => {
    return !isError && !isLoading && slices?.totalToday ? slices.totalToday : 0;
  }, [slices?.totalToday, isLoading]);
};
