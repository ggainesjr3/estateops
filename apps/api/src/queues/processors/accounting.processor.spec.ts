import './test-processor-setup';

jest.mock('../services/accounting-job.handler', () => ({
  AccountingJobHandler: class AccountingJobHandler {},
}));
jest.mock('../services/scheduler.service', () => ({
  SCHEDULER_ORG_SENTINEL: '__scheduler__',
  SchedulerService: class SchedulerService {},
}));

import { AccountingProcessor } from './accounting.processor';
import { AccountingJobHandler } from '../services/accounting-job.handler';
import { SchedulerService } from '../services/scheduler.service';

const SCHEDULER_ORG_SENTINEL = '__scheduler__';

describe('AccountingProcessor', () => {
  it('dispatches scheduled autopay fan-out', async () => {
    const scheduler = { dispatchAutopay: jest.fn().mockResolvedValue(undefined) };
    const handler = { handle: jest.fn() };
    const processor = new AccountingProcessor(
      { recordFailure: jest.fn() } as never,
      { recordCompleted: jest.fn(), recordFailed: jest.fn() } as never,
      handler as never,
      scheduler as never,
    );

    await processor.process({
      id: '1',
      name: 'process-autopay',
      data: {
        type: 'process_autopay',
        orgId: SCHEDULER_ORG_SENTINEL,
        idempotencyKey: 'repeat',
      },
    } as never);

    expect(scheduler.dispatchAutopay).toHaveBeenCalled();
    expect(handler.handle).not.toHaveBeenCalled();
  });
});
