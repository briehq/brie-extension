import type { AiGenerateType } from '../constants/enums/ai/generate-type.enum.js';

export interface GenerateBody {
  type: AiGenerateType;
  bundle: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface StepsResultV1 {
  summary: string;
  reproducibility?: 'low' | 'med' | 'high';
  prerequisites?: string[];
  steps: Array<{
    n: number;
    action: 'click' | 'type' | 'change' | 'submit' | 'navigate';
    target?: { role?: string; name?: string; css?: string };
    text?: string;
    page: string;
    evidence?: {
      screenshotId?: string;
      consoleIds?: string[];
      networkIds?: string[];
    };
    expectation?: string;
    actual?: string;
  }>;
  failure?: {
    time?: string;
    errorMessage?: string;
    topStackFrame?: string;
    failedRequests?: string[];
  };
}

export interface ReportResultV1 {
  title: string;
  severity: 'S1' | 'S2' | 'S3';
  summary: string;
  environment?: Record<string, unknown>;
  steps: StepsResultV1['steps'];
  evidence?: {
    errors?: Array<{ message: string; frame?: string; fingerprint?: string }>;
    network?: Array<{ url: string; status: number; when?: string; correlationId?: string }>;
    console?: Array<{ level: 'error' | 'warn' | 'info'; message: string; when?: string }>;
    screenshots?: unknown[];
  };
  suspectedCause?: string;
  suggestedOwner?: string;
  links?: { replay?: string; logs?: string[] };
}

export type GenerateResponse = StepsResultV1 | ReportResultV1;
