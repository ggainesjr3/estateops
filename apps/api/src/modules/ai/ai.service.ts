import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import { AiCallLogService } from './services/ai-call-log.service';
import {
  AI_SYSTEM_PROMPT,
  fraudRiskSchema,
  leaseExtractionSchema,
  maintenanceClassificationSchema,
  transcriptSummarySchema,
  type FraudRiskResult,
  type LeaseExtractionResult,
  type MaintenanceClassificationResult,
  type TranscriptSummaryResult,
} from './schemas/ai-schemas';
import {
  AI_MAX_RETRIES,
  AI_MAX_VALIDATION_RETRIES,
  AI_RETRY_BACKOFF_MS,
  sleep,
} from './utils/retry.util';

export interface ClassifyMaintenanceRequestInput {
  title: string;
  description?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: OpenAI | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly callLog: AiCallLogService,
  ) {}

  async classifyMaintenanceRequest(
    orgId: string,
    input: ClassifyMaintenanceRequestInput,
  ): Promise<MaintenanceClassificationResult> {
    const userPrompt = [
      'Classify this maintenance request.',
      `Title: ${input.title}`,
      `Description: ${input.description ?? '(none)'}`,
      'Return JSON: { "priority": "low"|"medium"|"high"|"critical", "trade": "plumbing"|"electrical"|"hvac"|"appliance"|"structural"|"cleaning"|"landscaping"|"general"|"pest_control", "summary": string, "confidence": number 0-1, "reasoning": string }',
    ].join('\n');

    return this.completeJson(orgId, 'classifyMaintenanceRequest', userPrompt, maintenanceClassificationSchema);
  }

  async extractLeaseData(orgId: string, text: string): Promise<LeaseExtractionResult> {
    const userPrompt = [
      'Extract lease fields from the following text.',
      text,
      'Return JSON: { "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "monthly_rent": number, "security_deposit": number, "tenant_names": string[], "property_address": string, "special_terms": string[] }',
    ].join('\n\n');

    return this.completeJson(orgId, 'extractLeaseData', userPrompt, leaseExtractionSchema);
  }

  async summarizeTranscript(orgId: string, transcript: string): Promise<TranscriptSummaryResult> {
    const userPrompt = [
      'Summarize this meeting transcript.',
      transcript,
      'Return JSON: { "summary": string, "action_items": [{ "assignee": string, "task": string, "due_date"?: "YYYY-MM-DD" }], "key_decisions": string[], "topics_discussed": string[] }',
    ].join('\n\n');

    return this.completeJson(orgId, 'summarizeTranscript', userPrompt, transcriptSummarySchema);
  }

  async detectFraudRisk(
    orgId: string,
    applicationData: Record<string, unknown>,
  ): Promise<FraudRiskResult> {
    const userPrompt = [
      'Assess rental application fraud risk from this data.',
      JSON.stringify(applicationData, null, 2),
      'Return JSON: { "risk_level": "low"|"medium"|"high", "risk_factors": string[], "recommendation": string }',
    ].join('\n\n');

    return this.completeJson(orgId, 'detectFraudRisk', userPrompt, fraudRiskSchema);
  }

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = this.config.get<string>('openai.apiKey');
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  private getModel(): string {
    return this.config.get<string>('openai.model') ?? 'gpt-4o';
  }

  private async completeJson<T>(
    orgId: string,
    method: string,
    userPrompt: string,
    schema: z.ZodSchema<T>,
  ): Promise<T> {
    const model = this.getModel();
    let validationRetries = 0;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= AI_MAX_RETRIES) {
      if (attempt > 0) {
        const backoff = AI_RETRY_BACKOFF_MS[attempt - 1];
        if (backoff !== undefined) {
          await sleep(backoff);
        }
      }

      const started = Date.now();
      try {
        const response = await this.getClient().chat.completions.create({
          model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: AI_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        });

        const latencyMs = Date.now() - started;
        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('OpenAI returned empty content');
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          throw new Error('OpenAI response is not valid JSON');
        }

        let validated: T;
        try {
          validated = schema.parse(parsed);
        } catch (zodErr) {
          if (validationRetries < AI_MAX_VALIDATION_RETRIES) {
            validationRetries += 1;
            this.logger.warn(
              `${method} Zod validation failed (org=${orgId}), retrying once: ${zodErr}`,
            );
            await this.callLog.record({
              orgId,
              method,
              model,
              promptTokens: response.usage?.prompt_tokens ?? 0,
              completionTokens: response.usage?.completion_tokens ?? 0,
              latencyMs,
              success: false,
              errorMessage: `validation_failed: ${zodErr}`,
            });
            continue;
          }
          throw zodErr;
        }

        await this.callLog.record({
          orgId,
          method,
          model,
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          latencyMs,
          success: true,
        });

        return validated;
      } catch (err) {
        const latencyMs = Date.now() - started;
        lastError = err instanceof Error ? err : new Error(String(err));
        await this.callLog.record({
          orgId,
          method,
          model,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs,
          success: false,
          errorMessage: lastError.message,
        });
        attempt += 1;
        if (attempt > AI_MAX_RETRIES) {
          break;
        }
        this.logger.warn(
          `${method} failed (org=${orgId}) attempt ${attempt}/${AI_MAX_RETRIES}: ${lastError.message}`,
        );
      }
    }

    throw lastError ?? new Error(`${method} failed after retries`);
  }
}
