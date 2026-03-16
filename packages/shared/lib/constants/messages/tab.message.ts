export const TAB = {
  GET_ACTIVE: 'TAB:GET_ACTIVE',
} as const;

export type TabMsg = (typeof TAB)[keyof typeof TAB];
