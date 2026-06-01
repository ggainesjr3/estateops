import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import openaiConfig from '../../config/openai.config';
import { MaintenanceTicket } from '../maintenance/entities/maintenance-ticket.entity';
import { TicketUpdate } from '../maintenance/entities/ticket-update.entity';
import { TicketStateMachineService } from '../maintenance/ticket-state-machine.service';
import { AiJobHandler } from './ai-job.handler';
import { AiService } from './ai.service';
import { AiCallLog } from './entities/ai-call-log.entity';
import { AiCallLogService } from './services/ai-call-log.service';

@Module({
  imports: [
    ConfigModule.forFeature(openaiConfig),
    TypeOrmModule.forFeature([AiCallLog, MaintenanceTicket, TicketUpdate]),
  ],
  providers: [
    AiService,
    AiCallLogService,
    AiJobHandler,
    TicketStateMachineService,
  ],
  exports: [AiService, AiCallLogService, AiJobHandler],
})
export class AiModule {}
