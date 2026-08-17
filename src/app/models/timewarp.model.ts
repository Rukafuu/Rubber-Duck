export interface TimewarpCapabilities {
  actor: string;
  approved_scopes: string[];
  supported_scopes: string[];
  consent_mode: string;
  mutation_tools: boolean;
  audit_trace_prefix: string;
  active_grant_ids?: string[];
  expires_at?: number;
}

export interface TimewarpConsentRequest {
  grant_id: string;
  status: 'PENDING';
  approved: false;
  requested_scopes: string[];
  reason: string;
  operator_action: string;
  audit_trace_id: string;
}

export interface TimewarpTraceSummary {
  TraceID: string;
  RootService: string;
  Status: string;
  StartedAt: number;
  DurationMS: number;
  EventCount: number;
}

export interface TimewarpDiagnostic {
  Code: string;
  EventID: string;
  Detail: string;
}

export interface TimewarpInspection {
  trace_id: string;
  graph: string;
  diagnostics: TimewarpDiagnostic[];
  event_count: number;
}

export interface TimewarpHttpRecord {
  method?: string;
  url?: string;
  status_code?: number;
}

export interface TimewarpEvent {
  event_id: string;
  trace_id: string;
  parent_id?: string;
  service: string;
  instance?: string;
  type: string;
  timestamp: number;
  duration_ms?: number;
  http?: TimewarpHttpRecord;
}

export interface TimewarpTrace {
  trace_id: string;
  events: TimewarpEvent[];
  redacted: boolean;
}

export interface TimewarpTraceBundle {
  summary: TimewarpTraceSummary;
  inspection: TimewarpInspection;
  trace: TimewarpTrace;
}
