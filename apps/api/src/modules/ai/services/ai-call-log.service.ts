import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiCallLog } from '../entities/ai-call-log.entity';

export interface AiCallLogParams {
  orgId: string;
  method: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string | null;
}

@Injectable()
export class AiCallLogService {
  private readonly logger = new Logger(AiCallLogService.name);

  constructor(
    @InjectRepository(AiCallLog)
    private readonly logs: Repository<AiCallLog>,
  ) {}

  async record(params: AiCallLogParams): Promise<void> {
    await this.logs.save(
      this.logs.create({
        orgId: params.orgId,
        method: params.method,
        model: params.model,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        latencyMs: params.latencyMs,
        success: params.success,
        errorMessage: params.errorMessage ?? null,
      }),
    );

    const status = params.success ? 'success' : 'failure';
    this.logger.log(
      `AI ${params.method} org=${params.orgId} model=${params.model} ` +
        `tokens=${params.promptTokens}+${params.completionTokens} ` +
        `latency=${params.latencyMs}ms ${status}`,
    );
  }
}
