import { Controller, Get, Header } from '@nestjs/common';
import { QueueMetricsService } from './services/queue-metrics.service';

@Controller('metrics')
export class QueueMetricsController {
  constructor(private readonly metricsService: QueueMetricsService) {}

  @Get('queues')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getQueueMetrics(): Promise<string> {
    return this.metricsService.getMetricsText();
  }
}
