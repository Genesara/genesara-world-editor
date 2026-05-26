export type Uuid = string;
export type NodeId = number;
export type WorldId = number;
export type Tick = number;
export type Seq = number;

export type IsoString = string;

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  warning?: string;
  [key: string]: unknown;
}

export interface FeedEnvelope<TPayload = unknown> {
  id: string;
  seq: Seq;
  type: string;
  tick: Tick;
  agent: Uuid | null;
  node: NodeId | null;
  payload: TPayload;
  occurredAt?: IsoString;
}

export interface AuditEntry<TPayload = unknown> {
  seq: Seq;
  adminId: Uuid;
  action: string;
  target: string;
  targetId: string;
  payload: TPayload;
  tick: Tick;
  occurredAt: IsoString;
}

export interface AuditPage {
  entries: AuditEntry[];
  nextCursor: Seq;
}

export type ConnectionState = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'disconnected' | 'degraded';
