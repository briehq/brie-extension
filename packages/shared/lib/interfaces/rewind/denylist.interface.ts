export type HostPattern =
  | { type: 'exact'; host: string }
  | { type: 'suffix'; suffix: string }
  | { type: 'prefix'; prefix: string };

export type PathHint = { type: 'contains'; value: string };

export type BlockReason = 'auth' | 'identity' | 'payment' | 'banking' | 'vault' | 'admin';

export type BlockRule = {
  hosts: HostPattern[];
  paths?: PathHint[];
  reason: BlockReason;
};
