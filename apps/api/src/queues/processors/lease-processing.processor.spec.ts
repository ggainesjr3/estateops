import './test-processor-setup';

jest.mock('../services/lease-processing.handler', () => ({
  LeaseProcessingHandler: class LeaseProcessingHandler {},
}));
jest.mock('../services/scheduler.service', () => ({
  SCHEDULER_ORG_SENTINEL: '__scheduler__',
  SchedulerService: class SchedulerService {},
}));

import { LeaseProcessingProcessor } from './lease-processing.processor';
import { LeaseProcessingHandler } from '../services/lease-processing.handler';
import { SchedulerService } from '../services/scheduler.service';

const SCHEDULER_ORG_SENTINEL = '__scheduler__';

describe('LeaseProcessingProcessor', () => {
  it('dispatches scheduled lease-expiry-check', async () => {
    const scheduler = { dispatchLeaseJob: jest.fn().mockResolvedValue(undefined) };
    const handler = { runExpiryCheck: jest.fn() };
    const processor = new LeaseProcessingProcessor(
      { recordFailure: jest.fn() } as never,
      { recordCompleted: jest.fn(), recordFailed: jest.fn() } as never,
      handler as never,
      scheduler as never,
    );

    await processor.process({
      id: '1',
      name: 'lease-expiry-check',
      data: { orgId: SCHEDULER_ORG_SENTINEL },
    } as never);

    expect(scheduler.dispatchLeaseJob).toHaveBeenCalledWith('lease-expiry-check');
  });
});
