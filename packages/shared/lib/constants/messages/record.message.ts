export const RECORD = {
  ADD: 'RECORD:ADD',
  GET_ALL: 'RECORD:GET_ALL',
  DELETE_ALL: 'RECORD:DELETE_ALL',
} as const;

export type RecordMsg = (typeof RECORD)[keyof typeof RECORD];
