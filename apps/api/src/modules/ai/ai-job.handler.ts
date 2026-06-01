import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MaintenanceTicketPriority,
  MaintenanceTicketStatus,
  MaintenanceTrade,
} from '@estateops/shared';
import {
  AI_TASK_CLASSIFY_MAINTENANCE,
  AI_TASK_DETECT_FRAUD,
  AI_TASK_EXTRACT_LEASE,
  AI_TASK_SUMMARIZE_TRANSCRIPT,
  type AiProcessingJobData,
  type ClassifyMaintenanceJobInput,
  type DetectFraudJobInput,
  type ExtractLeaseJobInput,
  type SummarizeTranscriptJobInput,
} from '../../queues/types/ai-jobs';
import { MaintenanceTicket } from '../maintenance/entities/maintenance-ticket.entity';
import { TicketUpdate } from '../maintenance/entities/ticket-update.entity';
import { TicketStateMachineService } from '../maintenance/ticket-state-machine.service';
import { AiService } from './ai.service';

@Injectable()
export class AiJobHandler {
  private readonly logger = new Logger(AiJobHandler.name);

  constructor(
    private readonly aiService: AiService,
    private readonly stateMachine: TicketStateMachineService,
    @InjectRepository(MaintenanceTicket)
    private readonly tickets: Repository<MaintenanceTicket>,
    @InjectRepository(TicketUpdate)
    private readonly updates: Repository<TicketUpdate>,
  ) {}

  async handle(job: AiProcessingJobData): Promise<unknown> {
    switch (job.task) {
      case AI_TASK_CLASSIFY_MAINTENANCE:
        return this.handleClassifyMaintenance(job.orgId, job.input as ClassifyMaintenanceJobInput);
      case AI_TASK_EXTRACT_LEASE:
        return this.handleExtractLease(job.orgId, job.input as ExtractLeaseJobInput);
      case AI_TASK_SUMMARIZE_TRANSCRIPT:
        return this.handleSummarizeTranscript(job.orgId, job.input as SummarizeTranscriptJobInput);
      case AI_TASK_DETECT_FRAUD:
        return this.handleDetectFraud(job.orgId, job.input as DetectFraudJobInput);
      default:
        throw new Error(`Unknown AI task: ${(job as AiProcessingJobData).task}`);
    }
  }

  private async handleClassifyMaintenance(
    orgId: string,
    input: ClassifyMaintenanceJobInput,
  ) {
    const result = await this.aiService.classifyMaintenanceRequest(orgId, {
      title: input.title,
      description: input.description,
    });

    const priority = result.priority as MaintenanceTicketPriority;
    const trade = result.trade as MaintenanceTrade;
    const aiClassification = {
      source: 'openai',
      model: 'gpt-4o',
      ...result,
      classifiedAt: new Date().toISOString(),
    };

    const ticket = await this.tickets.findOne({
      where: { id: input.ticketId, orgId },
    });
    if (!ticket) {
      this.logger.warn(`Ticket ${input.ticketId} not found for AI classification`);
      return result;
    }

    await this.tickets.update(
      { id: input.ticketId, orgId },
      { priority, trade, aiClassification },
    );

    if (ticket.status === MaintenanceTicketStatus.CREATED) {
      this.stateMachine.assertTransition(
        MaintenanceTicketStatus.CREATED,
        MaintenanceTicketStatus.TRIAGED,
      );
      await this.tickets.update(
        { id: input.ticketId, orgId },
        { status: MaintenanceTicketStatus.TRIAGED },
      );
      await this.updates.save(
        this.updates.create({
          orgId,
          ticketId: input.ticketId,
          statusFrom: MaintenanceTicketStatus.CREATED,
          statusTo: MaintenanceTicketStatus.TRIAGED,
          note: `AI triage: ${result.summary}`,
          updatedByUserId: input.actorUserId ?? null,
        }),
      );
    }

    return result;
  }

  private handleExtractLease(orgId: string, input: ExtractLeaseJobInput) {
    return this.aiService.extractLeaseData(orgId, input.text);
  }

  private handleSummarizeTranscript(orgId: string, input: SummarizeTranscriptJobInput) {
    return this.aiService.summarizeTranscript(orgId, input.transcript);
  }

  private handleDetectFraud(orgId: string, input: DetectFraudJobInput) {
    return this.aiService.detectFraudRisk(orgId, input.applicationData);
  }
}
