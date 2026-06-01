import './test-processor-setup';

jest.mock('../services/sms-delivery.service', () => ({
  SmsDeliveryService: class SmsDeliveryService {},
}));
jest.mock('../services/org-job-context.service', () => ({
  OrgJobContextService: class OrgJobContextService {},
}));

import { SmsProcessor } from './sms.processor';
import { SmsDeliveryService } from '../services/sms-delivery.service';
import { OrgJobContextService } from '../services/org-job-context.service';

describe('SmsProcessor', () => {
  it('sends sms under org context', async () => {
    const smsDelivery = {
      send: jest.fn().mockResolvedValue({ sid: 'SM1', communicationId: 'comm-1' }),
    };
    const orgJobContext = {
      resolveActor: jest.fn().mockResolvedValue({ orgId: 'org-1', userId: 'user-1' }),
      runAsOrg: jest.fn((_org: string, fn: () => Promise<unknown>) => fn()),
    };

    const processor = new SmsProcessor(
      { recordFailure: jest.fn() } as never,
      { recordCompleted: jest.fn(), recordFailed: jest.fn() } as never,
      smsDelivery as never,
      orgJobContext as never,
    );

    await processor.process({
      id: '1',
      name: 'send',
      data: { to: '+15551212', message: 'Hi', tenantId: 't-1', orgId: 'org-1' },
    } as never);

    expect(smsDelivery.send).toHaveBeenCalled();
  });
});
