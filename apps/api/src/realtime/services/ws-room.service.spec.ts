jest.mock('typeorm', () => ({ Repository: class Repository {} }));
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));
jest.mock('../../modules/properties/entities/property.entity', () => ({ Property: class Property {} }));
jest.mock('../../modules/tenants/entities/tenant.entity', () => ({ Tenant: class Tenant {} }));

import { MembershipRole } from '@estateops/shared';
import {
  orgRoom,
  propertyRoom,
  tenantRoom,
  userRoom,
  WsRoomService,
} from './ws-room.service';

describe('WsRoomService', () => {
  const properties = { find: jest.fn() };
  const tenants = { findOne: jest.fn() };
  let service: WsRoomService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WsRoomService(properties as never, tenants as never);
  });

  it('joins user and org rooms for all roles', async () => {
    const rooms = await service.resolveRooms({
      userId: 'u1',
      orgId: 'o1',
      role: MembershipRole.ACCOUNTANT,
    });

    expect(rooms).toEqual(expect.arrayContaining([userRoom('u1'), orgRoom('o1')]));
    expect(rooms).toHaveLength(2);
  });

  it('adds property rooms for property managers', async () => {
    properties.find.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

    const rooms = await service.resolveRooms({
      userId: 'pm1',
      orgId: 'o1',
      role: MembershipRole.PROPERTY_MANAGER,
    });

    expect(rooms).toEqual(
      expect.arrayContaining([
        userRoom('pm1'),
        orgRoom('o1'),
        propertyRoom('p1'),
        propertyRoom('p2'),
      ]),
    );
  });

  it('adds tenant room for tenant membership', async () => {
    tenants.findOne.mockResolvedValue({ id: 't1' });

    const user: {
      userId: string;
      orgId: string;
      role: MembershipRole;
      tenantId?: string;
    } = {
      userId: 'u1',
      orgId: 'o1',
      role: MembershipRole.TENANT,
    };
    const rooms = await service.resolveRooms(user);

    expect(rooms).toContain(tenantRoom('t1'));
    expect(user.tenantId).toBe('t1');
  });

  it('joins socket to resolved rooms', async () => {
    properties.find.mockResolvedValue([]);
    const join = jest.fn();
    const socket = { join } as never;

    const joined = await service.joinRooms(socket, {
      userId: 'u1',
      orgId: 'o1',
      role: MembershipRole.ORG_ADMIN,
    });

    expect(join).toHaveBeenCalledWith(joined);
    expect(joined).toContain(userRoom('u1'));
  });
});
