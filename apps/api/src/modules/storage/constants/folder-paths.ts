export function orgMeetingsPath(orgId: string): string {
  return `${orgId}/Meetings`;
}

export function orgPropertiesRootPath(orgId: string): string {
  return `${orgId}/Properties`;
}

export function propertyLeasesPath(orgId: string, propertyId: string): string {
  return `${orgId}/Properties/${propertyId}/Leases`;
}

export function propertyMaintenancePath(orgId: string, propertyId: string): string {
  return `${orgId}/Properties/${propertyId}/Maintenance`;
}

export function propertyFinancialsPath(orgId: string, propertyId: string): string {
  return `${orgId}/Properties/${propertyId}/Financials`;
}

export function tenantFolderPath(orgId: string, tenantId: string): string {
  return `${orgId}/Tenants/${tenantId}`;
}

export function orgFolderPaths(orgId: string): string[] {
  return [orgMeetingsPath(orgId), orgPropertiesRootPath(orgId)];
}

export function propertyFolderPaths(orgId: string, propertyId: string): string[] {
  return [
    propertyLeasesPath(orgId, propertyId),
    propertyMaintenancePath(orgId, propertyId),
    propertyFinancialsPath(orgId, propertyId),
  ];
}
