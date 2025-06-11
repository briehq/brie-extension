import { useMemo } from 'react';

import { useGetSlicesQuery } from '@extension/store';

export const useSlicesCreatedToday = (): number => {
  const { isLoading, isError, data: slices } = useGetSlicesQuery({ limit: 1, take: 10 });

  console.log('totalToday', slices?.totalToday);

  return useMemo(() => {
    return !isLoading && slices?.totalToday;
  }, [slices?.totalToday, isLoading]);
};
