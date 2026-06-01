import './test-processor-setup';
import { EmailProcessor } from './email.processor';
import { EmailDeliveryService } from '../services/email-delivery.service';

describe('EmailProcessor', () => {
  it('sends email via delivery service', async () => {
    const emailDelivery = {
      send: jest.fn().mockResolvedValue({ provider: 'sendgrid', messageId: 'msg-1' }),
    };
    const processor = new EmailProcessor(
      { recordFailure: jest.fn() } as never,
      { recordCompleted: jest.fn(), recordFailed: jest.fn() } as never,
      emailDelivery as never,
    );

    const result = await processor.process({
      id: '1',
      name: 'send',
      data: {
        to: 'a@b.com',
        subject: 'Hello',
        templateId: 'tpl_1',
        variables: { name: 'Test' },
      },
    } as never);

    expect(emailDelivery.send).toHaveBeenCalled();
    expect(result.delivery).toEqual({ provider: 'sendgrid', messageId: 'msg-1' });
  });
});
