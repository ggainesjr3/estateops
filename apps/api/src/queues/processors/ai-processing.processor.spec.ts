import './test-processor-setup';

jest.mock('../../modules/ai/ai-job.handler', () => ({
  AiJobHandler: class AiJobHandler {
    handle = jest.fn().mockResolvedValue({ ok: true });
  },
}));

jest.mock('../services/org-job-context.service', () => ({
  OrgJobContextService: class OrgJobContextService {
    runAsOrg = jest.fn((_orgId: string, fn: () => Promise<unknown>) => fn());
  },
}));

import { AiProcessingProcessor } from './ai-processing.processor';
import { AiJobHandler } from '../../modules/ai/ai-job.handler';
import { OrgJobContextService } from '../services/org-job-context.service';
import { AI_TASK_CLASSIFY_MAINTENANCE } from '../types/ai-jobs';

describe('AiProcessingProcessor', () => {
  it('delegates job to AiJobHandler under org context', async () => {
    const handler = {
      handle: jest.fn().mockResolvedValue({ ok: true }),
    } as unknown as AiJobHandler;
    const orgContext = {
      runAsOrg: jest.fn((_orgId: string, fn: () => Promise<unknown>) => fn()),
    } as unknown as OrgJobContextService;

    const processor = new AiProcessingProcessor(
      { recordFailure: jest.fn() } as never,
      { recordCompleted: jest.fn(), recordFailed: jest.fn() } as never,
      handler,
      orgContext,
    );

    const jobData = {
      orgId: 'org-1',
      task: AI_TASK_CLASSIFY_MAINTENANCE,
      input: { ticketId: 't-1', title: 'Leak' },
    };

    const result = await processor.process({
      id: '1',
      name: AI_TASK_CLASSIFY_MAINTENANCE,
      data: jobData,
    } as never);

    expect(orgContext.runAsOrg).toHaveBeenCalledWith('org-1', expect.any(Function));
    expect(handler.handle).toHaveBeenCalledWith(jobData);
    expect(result).toEqual({ ok: true });
  });
});
