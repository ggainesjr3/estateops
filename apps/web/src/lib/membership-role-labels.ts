/** Local membership role values — do not import from @estateops/shared (breaks in browser). */
export const MEMBERSHIP_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  PROPERTY_MANAGER: 'property_manager',
  ACCOUNTANT: 'accountant',
  MAINTENANCE_STAFF: 'maintenance_staff',
  VENDOR: 'vendor',
  TENANT: 'tenant',
  READ_ONLY: 'read_only',
} as const;

export type MembershipRoleValue =
  (typeof MEMBERSHIP_ROLES)[keyof typeof MEMBERSHIP_ROLES];

export const MEMBERSHIP_ROLE_LABELS: Record<MembershipRoleValue, string> = {
  [MEMBERSHIP_ROLES.SUPER_ADMIN]: 'Super Admin',
  [MEMBERSHIP_ROLES.ORG_ADMIN]: 'Org Admin',
  [MEMBERSHIP_ROLES.PROPERTY_MANAGER]: 'Property Manager',
  [MEMBERSHIP_ROLES.ACCOUNTANT]: 'Accountant',
  [MEMBERSHIP_ROLES.MAINTENANCE_STAFF]: 'Maintenance Staff',
  [MEMBERSHIP_ROLES.VENDOR]: 'Vendor',
  [MEMBERSHIP_ROLES.TENANT]: 'Tenant',
  [MEMBERSHIP_ROLES.READ_ONLY]: 'Read Only',
};

export const ALL_MEMBERSHIP_ROLES: MembershipRoleValue[] = Object.values(MEMBERSHIP_ROLES);
