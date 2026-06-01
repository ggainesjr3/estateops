export const AI_TASK_CLASSIFY_MAINTENANCE = 'classify_maintenance';
export const AI_TASK_EXTRACT_LEASE = 'extract_lease';
export const AI_TASK_SUMMARIZE_TRANSCRIPT = 'summarize_transcript';
export const AI_TASK_DETECT_FRAUD = 'detect_fraud';

export type AiProcessingTask =
  | typeof AI_TASK_CLASSIFY_MAINTENANCE
  | typeof AI_TASK_EXTRACT_LEASE
  | typeof AI_TASK_SUMMARIZE_TRANSCRIPT
  | typeof AI_TASK_DETECT_FRAUD;

export interface ClassifyMaintenanceJobInput {
  ticketId: string;
  title: string;
  description?: string;
  actorUserId?: string;
}

export interface ExtractLeaseJobInput {
  text: string;
  leaseId?: string;
}

export interface SummarizeTranscriptJobInput {
  transcript: string;
  referenceId?: string;
}

export interface DetectFraudJobInput {
  applicationData: Record<string, unknown>;
  applicationId?: string;
}

export type AiJobInput =
  | ClassifyMaintenanceJobInput
  | ExtractLeaseJobInput
  | SummarizeTranscriptJobInput
  | DetectFraudJobInput;

export interface AiProcessingJobData {
  orgId: string;
  task: AiProcessingTask;
  input: AiJobInput;
}
