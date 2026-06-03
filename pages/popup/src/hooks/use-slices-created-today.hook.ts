import { useMemo } from 'react';

import { useGetSlicesQuery } from '@extension/store';

export const useSlicesCreatedToday = (): number => {
  const { isLoading, isError, data: slices } = useGetSlicesQuery({ limit: 1, take: 10 });

  return useMemo(() => {
    return !isError && !isLoading && slices?.totalToday ? slices.totalToday : 0;
  }, [isError, isLoading, slices?.totalToday]);
};
