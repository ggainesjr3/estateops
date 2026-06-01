export interface MaintenanceTriageInput {
  orgId: string;
  ticketId: string;
  title: string;
  description?: string;
  actorUserId?: string;
}

export interface MaintenanceSlaAlertJobData {
  orgId: string;
  ticketId: string;
  slaDueAt: string;
  notifyEmail?: string;
  ticketTitle?: string;
}
