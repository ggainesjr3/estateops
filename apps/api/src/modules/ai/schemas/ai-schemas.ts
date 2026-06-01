import { z } from 'zod';

const maintenancePriority = z.enum(['low', 'medium', 'high', 'critical']);
const maintenanceTrade = z.enum([
  'plumbing',
  'electrical',
  'hvac',
  'appliance',
  'structural',
  'cleaning',
  'landscaping',
  'general',
  'pest_control',
]);

export const maintenanceClassificationSchema = z.object({
  priority: maintenancePriority,
  trade: maintenanceTrade,
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type MaintenanceClassificationResult = z.infer<typeof maintenanceClassificationSchema>;

export const leaseExtractionSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  monthly_rent: z.number(),
  security_deposit: z.number(),
  tenant_names: z.array(z.string()),
  property_address: z.string(),
  special_terms: z.array(z.string()),
});

export type LeaseExtractionResult = z.infer<typeof leaseExtractionSchema>;

export const transcriptSummarySchema = z.object({
  summary: z.string(),
  action_items: z.array(
    z.object({
      assignee: z.string(),
      task: z.string(),
      due_date: z.string().optional(),
    }),
  ),
  key_decisions: z.array(z.string()),
  topics_discussed: z.array(z.string()),
});

export type TranscriptSummaryResult = z.infer<typeof transcriptSummarySchema>;

const fraudRiskLevel = z.enum(['low', 'medium', 'high']);

export const fraudRiskSchema = z.object({
  risk_level: fraudRiskLevel,
  risk_factors: z.array(z.string()),
  recommendation: z.string(),
});

export type FraudRiskResult = z.infer<typeof fraudRiskSchema>;

export const AI_SYSTEM_PROMPT =
  'Respond ONLY with valid JSON matching the exact schema. Do not include markdown fences or commentary.';
