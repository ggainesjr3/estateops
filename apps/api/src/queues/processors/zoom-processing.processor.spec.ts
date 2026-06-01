import './test-processor-setup';

jest.mock('../../modules/zoom/services/zoom-processing.handler', () => ({
  ZoomProcessingHandler: class ZoomProcessingHandler {
    process = jest.fn().mockResolvedValue(undefined);
  },
}));

jest.mock('../services/org-job-context.service', () => ({
  OrgJobContextService: class OrgJobContextService {
    runAsOrg = jest.fn((_org: string, fn: () => Promise<void>) => fn());
  },
}));

import { ZoomProcessingProcessor } from './zoom-processing.processor';

describe('ZoomProcessingProcessor', () => {
  it('delegates to ZoomProcessingHandler', async () => {
    const handler = { process: jest.fn().mockResolvedValue(undefined) };
    const orgJobContext = {
      runAsOrg: jest.fn((_org: string, fn: () => Promise<void>) => fn()),
    };

    const processor = new ZoomProcessingProcessor(
      { recordFailure: jest.fn() } as never,
      { recordCompleted: jest.fn(), recordFailed: jest.fn() } as never,
      orgJobContext as never,
      handler as never,
    );

    const result = await processor.process({
      id: '1',
      name: 'process',
      data: { orgId: 'org-1', archiveId: 'arch-1' },
    } as never);

    expect(handler.process).toHaveBeenCalledWith('org-1', 'arch-1');
    expect(result.status).toBe('processed');
  });
});
