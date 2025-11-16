import type { User } from '@extension/shared';

import { useGetUserDetailsQuery } from '../store/index.js';

export const useUser = (): {
  fields?: User;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  isUninitialized: boolean;
} => {
  const { isLoading, isFetching, isUninitialized, isError, data } = useGetUserDetailsQuery();

  return {
    fields: data,
    isLoading,
    isFetching,
    isUninitialized,
    isError,
  };
};
