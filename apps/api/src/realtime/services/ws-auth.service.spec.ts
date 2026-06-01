jest.mock('typeorm', () => ({ Repository: class Repository {} }));
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));
jest.mock('../../modules/organization-memberships/entities/organization-membership.entity', () => ({
  OrganizationMembership: class OrganizationMembership {},
}));

import { UnauthorizedException } from '@nestjs/common';
import { MembershipRole } from '@estateops/shared';
import { WsAuthService } from './ws-auth.service';

describe('WsAuthService', () => {
  const jwtService = { verify: jest.fn() };
  const config = { get: jest.fn().mockReturnValue('secret') };
  const memberships = { findOne: jest.fn() };

  let service: WsAuthService;

  const socket = (auth: Record<string, unknown>) =>
    ({
      handshake: { auth, headers: {} },
    }) as never;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WsAuthService(jwtService as never, config as never, memberships as never);
  });

  it('authenticates valid token and active membership', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', org_id: 'org-1', email: 'a@b.c' });
    memberships.findOne.mockResolvedValue({
      userId: 'user-1',
      orgId: 'org-1',
      role: MembershipRole.PROPERTY_MANAGER,
      isActive: true,
    });

    const user = await service.authenticate(socket({ token: 'jwt-token' }));

    expect(user).toEqual({
      userId: 'user-1',
      orgId: 'org-1',
      role: MembershipRole.PROPERTY_MANAGER,
      email: 'a@b.c',
    });
    expect(jwtService.verify).toHaveBeenCalledWith('jwt-token', { secret: 'secret' });
  });

  it('rejects missing token', async () => {
    await expect(service.authenticate(socket({}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects invalid token', async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('bad');
    });
    await expect(service.authenticate(socket({ token: 'bad' }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when membership is missing', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', org_id: 'org-1' });
    memberships.findOne.mockResolvedValue(null);
    await expect(service.authenticate(socket({ token: 'jwt' }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
