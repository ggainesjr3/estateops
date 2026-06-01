/** Access token JWT payload (tenant middleware expects these claims). */
export interface JwtAccessPayload {
  sub: string;
  org_id: string;
  email?: string;
  /** Role of the user within `org_id` (also validated against DB). */
  role?: string;
  /** Optional camelCase alias for clients/strategies. */
  orgId?: string;
}
