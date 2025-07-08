export interface NetworkRecord {
  recordType: string;
  url?: string;
  method?: string;
  status?: number;
  duration?: number;
  requestSize?: number;
  responseSize?: number;
  timing?: {
    requestStart: number;
    requestEnd: number;
    duration: number;
  };
  timestamp?: number;
  source?: string;
  [key: string]: unknown;
}
