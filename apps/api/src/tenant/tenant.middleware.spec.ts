import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TenantMiddleware } from './tenant.middleware';
import { TenantContext } from './tenant.context';
import { TEST_JWT_SECRET } from '../test/tenant-test.util';

describe('TenantMiddleware', () => {
  const jwtService = new JwtService({ secret: TEST_JWT_SECRET });
  const configService = {
    get: jest.fn((key: string) => (key === 'jwt.secret' ? TEST_JWT_SECRET : undefined)),
  } as unknown as ConfigService;
  const middleware = new TenantMiddleware(jwtService, configService);

  const orgId = '11111111-1111-1111-1111-111111111111';
  const userId = '22222222-2222-2222-2222-222222222222';

  it('rejects missing authorization header', () => {
    const req = { headers: {}, params: {}, query: {} } as never;
    expect(() => middleware.use(req, {} as never, jest.fn())).toThrow(UnauthorizedException);
  });

  it('attaches org and user to AsyncLocalStorage', () => {
    const token = jwtService.sign({ sub: userId, org_id: orgId });
    const req = {
      headers: { authorization: `Bearer ${token}` },
      params: {},
      query: {},
    } as never;
    const next = jest.fn(() => {
      expect(TenantContext.getOrgId()).toBe(orgId);
      expect(TenantContext.getUserId()).toBe(userId);
    });
    middleware.use(req, {} as never, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects org_id mismatch with x-org-id header', () => {
    const token = jwtService.sign({ sub: userId, org_id: orgId });
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
        'x-org-id': '99999999-9999-9999-9999-999999999999',
      },
      params: {},
      query: {},
    } as never;
    expect(() => middleware.use(req, {} as never, jest.fn())).toThrow(UnauthorizedException);
  });

  it('rejects token without org_id claim', () => {
    const token = jwtService.sign({ sub: userId });
    const req = {
      headers: { authorization: `Bearer ${token}` },
      params: {},
      query: {},
    } as never;
    expect(() => middleware.use(req, {} as never, jest.fn())).toThrow(UnauthorizedException);
  });
});
