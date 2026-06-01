/** Shared Jest mocks for queue processor unit tests. */
jest.mock('@nestjs/bullmq', () => ({
  Processor: () => () => undefined,
  WorkerHost: class WorkerHost {},
  OnWorkerEvent: () => () => undefined,
  InjectQueue: () => () => undefined,
}));

jest.mock('../services/failed-job.service', () => ({
  FailedJobService: class FailedJobService {
    recordFailure = jest.fn().mockResolvedValue(undefined);
  },
}));

jest.mock('../services/queue-metrics.service', () => ({
  QueueMetricsService: class QueueMetricsService {
    recordCompleted = jest.fn();
    recordFailed = jest.fn();
  },
}));
