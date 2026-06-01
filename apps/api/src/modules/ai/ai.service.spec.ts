const mockCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

jest.mock('./services/ai-call-log.service', () => ({
  AiCallLogService: class AiCallLogService {},
}));

import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiCallLogService } from './services/ai-call-log.service';

function openAiResponse(content: object, usage = { prompt_tokens: 10, completion_tokens: 20 }) {
  return {
    choices: [{ message: { content: JSON.stringify(content) } }],
    usage,
  };
}

describe('AiService', () => {
  let service: AiService;
  let callLog: { record: jest.Mock };

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'openai.apiKey') return 'test-key';
      if (key === 'openai.model') return 'gpt-4o';
      return undefined;
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    callLog = { record: jest.fn().mockResolvedValue(undefined) };
    service = new AiService(config, callLog as unknown as AiCallLogService);
  });

  describe('classifyMaintenanceRequest', () => {
    it('returns validated classification from OpenAI JSON', async () => {
      mockCreate.mockResolvedValueOnce(
        openAiResponse({
          priority: 'high',
          trade: 'plumbing',
          summary: 'Active leak under sink',
          confidence: 0.92,
          reasoning: 'Water damage keywords',
        }),
      );

      const result = await service.classifyMaintenanceRequest('org-1', {
        title: 'Leaking pipe',
        description: 'Water pooling',
      });

      expect(result.priority).toBe('high');
      expect(result.trade).toBe('plumbing');
      expect(result.confidence).toBe(0.92);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('Respond ONLY with valid JSON'),
            }),
          ]),
        }),
      );
      expect(callLog.record).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-1',
          method: 'classifyMaintenanceRequest',
          model: 'gpt-4o',
          success: true,
          promptTokens: 10,
          completionTokens: 20,
        }),
      );
    });

    it('retries once when Zod validation fails then succeeds', async () => {
      mockCreate
        .mockResolvedValueOnce(
          openAiResponse({
            priority: 'high',
            trade: 'plumbing',
            summary: 'x',
            confidence: 2,
            reasoning: 'bad',
          }),
        )
        .mockResolvedValueOnce(
          openAiResponse({
            priority: 'high',
            trade: 'plumbing',
            summary: 'Fixed',
            confidence: 0.8,
            reasoning: 'ok',
          }),
        );

      const result = await service.classifyMaintenanceRequest('org-1', {
        title: 'Leak',
      });

      expect(result.confidence).toBe(0.8);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('throws after max API retries', async () => {
      mockCreate.mockRejectedValue(new Error('rate limit'));

      await expect(
        service.classifyMaintenanceRequest('org-1', { title: 'Noise' }),
      ).rejects.toThrow('rate limit');

      expect(mockCreate).toHaveBeenCalledTimes(3);
    }, 15000);
  });

  describe('extractLeaseData', () => {
    it('parses lease extraction schema', async () => {
      mockCreate.mockResolvedValueOnce(
        openAiResponse({
          start_date: '2025-01-01',
          end_date: '2026-01-01',
          monthly_rent: 2500,
          security_deposit: 5000,
          tenant_names: ['Jane Doe'],
          property_address: '123 Main St',
          special_terms: ['No pets'],
        }),
      );

      const result = await service.extractLeaseData('org-1', 'Lease text here');
      expect(result.monthly_rent).toBe(2500);
      expect(result.tenant_names).toEqual(['Jane Doe']);
    });
  });

  describe('summarizeTranscript', () => {
    it('parses transcript summary schema', async () => {
      mockCreate.mockResolvedValueOnce(
        openAiResponse({
          summary: 'Discussed renewal',
          action_items: [{ assignee: 'PM', task: 'Send offer', due_date: '2025-06-01' }],
          key_decisions: ['Renew at 3% increase'],
          topics_discussed: ['rent', 'parking'],
        }),
      );

      const result = await service.summarizeTranscript('org-1', 'Meeting transcript...');
      expect(result.action_items).toHaveLength(1);
      expect(result.key_decisions[0]).toContain('3%');
    });
  });

  describe('detectFraudRisk', () => {
    it('parses fraud risk schema', async () => {
      mockCreate.mockResolvedValueOnce(
        openAiResponse({
          risk_level: 'medium',
          risk_factors: ['Income mismatch'],
          recommendation: 'Request pay stubs',
        }),
      );

      const result = await service.detectFraudRisk('org-1', {
        stated_income: 200000,
        verified_income: 45000,
      });
      expect(result.risk_level).toBe('medium');
      expect(result.risk_factors).toContain('Income mismatch');
    });
  });
});
