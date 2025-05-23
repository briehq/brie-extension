import { useMemo } from 'react';

import type { User } from '@extension/shared';

import { useGetUserDetailsQuery } from '../store/index.js';

export const useUser = (): {
  fields: User | undefined;
  isLoading: boolean;
  isError: boolean;
} => {
  const { isLoading, isError, data } = useGetUserDetailsQuery();

  return useMemo(() => ({ isLoading, isError, fields: data }), [data]);
};
