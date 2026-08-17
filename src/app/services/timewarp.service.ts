import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import {
  TimewarpCapabilities,
  TimewarpConsentRequest,
  TimewarpInspection,
  TimewarpTrace,
  TimewarpTraceBundle,
  TimewarpTraceSummary,
} from '../models/timewarp.model';

type TimewarpConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

@Injectable({ providedIn: 'root' })
export class TimewarpService {
  private readonly http = inject(HttpClient);
  private baseUrl = '';
  private pairingToken = '';

  readonly connectionState = signal<TimewarpConnectionState>('disconnected');
  readonly capabilities = signal<TimewarpCapabilities | null>(null);
  readonly traces = signal<TimewarpTraceSummary[]>([]);
  readonly pendingConsent = signal<TimewarpConsentRequest | null>(null);
  readonly error = signal<string>('');
  readonly sessionId = signal(`rubber-duck-${cryptoSafeId()}`);

  async connect(baseUrl: string, pairingToken: string): Promise<void> {
    this.connectionState.set('connecting');
    this.error.set('');
    try {
      this.baseUrl = normalizeLoopbackUrl(baseUrl);
      this.pairingToken = pairingToken.trim();
      if (!this.pairingToken) throw new Error('Informe o token de pareamento exibido pelo Timewarp.');
      await this.get<{ status: string }>('/v1/health');
      await this.refreshCapabilities();
      this.connectionState.set('connected');
    } catch (error) {
      this.disconnect();
      this.connectionState.set('error');
      this.error.set(readableError(error));
      throw error;
    }
  }

  async connectAndRequestAccess(): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('A conexão automática com o Timewarp requer um navegador.');
    }
    this.connectionState.set('connecting');
    this.error.set('');
    this.baseUrl = 'http://127.0.0.1:7779';
    try {
      const challenge = createPairingChallenge();
      launchTimewarpProtocol(window.location.origin, challenge);
      const pairing = await this.waitForPairing(challenge);
      this.pairingToken = pairing.token;
      await this.get<{ status: string }>('/v1/health');
      await this.refreshCapabilities();
      this.connectionState.set('connected');
      if (!this.capabilities()?.approved_scopes.includes('trace:read')) {
        await this.requestTraceConsent();
        void this.pollUntilTraceAccess();
      } else {
        await this.searchTraces();
      }
    } catch (error) {
      this.disconnect();
      this.connectionState.set('error');
      const message = readableError(error);
      this.error.set(message);
      throw new Error(message);
    }
  }

  disconnect(): void {
    this.baseUrl = '';
    this.pairingToken = '';
    this.capabilities.set(null);
    this.traces.set([]);
    this.pendingConsent.set(null);
    this.connectionState.set('disconnected');
  }

  async refreshCapabilities(): Promise<TimewarpCapabilities> {
    const capabilities = await this.get<TimewarpCapabilities>('/v1/capabilities', {
      session_id: this.sessionId(),
    });
    this.capabilities.set(capabilities);
    if (capabilities.approved_scopes.includes('trace:read')) this.pendingConsent.set(null);
    return capabilities;
  }

  async requestTraceConsent(): Promise<TimewarpConsentRequest> {
    const result = await this.post<TimewarpConsentRequest>('/v1/consent/requests', {
      session_id: this.sessionId(),
      requested_scopes: ['trace:read'],
      reason: 'Importar traces redigidos e diagnósticos causais no Rubber Duck.',
    });
    this.pendingConsent.set(result);
    return result;
  }

  async searchTraces(service = ''): Promise<TimewarpTraceSummary[]> {
    const result = await this.get<{ traces: TimewarpTraceSummary[] }>('/v1/traces', {
      session_id: this.sessionId(), service, limit: '50',
    });
    this.traces.set(result.traces ?? []);
    return this.traces();
  }

  async loadTraceBundle(summary: TimewarpTraceSummary): Promise<TimewarpTraceBundle> {
    const traceID = encodeURIComponent(summary.TraceID);
    const params = { session_id: this.sessionId() };
    const [inspection, trace] = await Promise.all([
      this.get<TimewarpInspection>(`/v1/traces/${traceID}/inspection`, params),
      this.get<TimewarpTrace>(`/v1/traces/${traceID}`, params),
    ]);
    return { summary, inspection, trace };
  }

  private get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.baseUrl + path, {
      headers: this.headers(), params: new HttpParams({ fromObject: params }),
    }).pipe(timeout(7000)));
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.baseUrl + path, body, {
      headers: this.headers(),
    }).pipe(timeout(7000)));
  }

  private async waitForPairing(challenge: string): Promise<{ token: string }> {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      try {
        return await firstValueFrom(this.http.get<{ token: string }>(`${this.baseUrl}/v1/pair`, {
          params: new HttpParams({ fromObject: { challenge } }),
        }).pipe(timeout(1500)));
      } catch {
        await delay(500);
      }
    }
    throw new Error('O Timewarp não iniciou. Instale o protocolo com `timewarp protocol install` e tente novamente.');
  }

  private async pollUntilTraceAccess(): Promise<void> {
    const deadline = Date.now() + 2 * 60_000;
    while (Date.now() < deadline && this.connectionState() === 'connected') {
      await delay(1000);
      try {
        const capabilities = await this.refreshCapabilities();
        if (capabilities.approved_scopes.includes('trace:read')) {
          await this.searchTraces();
          return;
        }
      } catch {
        // A concessão pode estar sendo confirmada no terminal local.
      }
    }
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.pairingToken}` });
  }
}

function normalizeLoopbackUrl(value: string): string {
  const parsed = new URL(value.trim() || 'http://127.0.0.1:7779');
  if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)) {
    throw new Error('O bridge deve usar uma URL HTTP local: 127.0.0.1, localhost ou ::1.');
  }
  return parsed.origin;
}

function cryptoSafeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createPairingChallenge(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function launchTimewarpProtocol(origin: string, challenge: string): void {
  const link = document.createElement('a');
  link.href = `timewarp://pair?origin=${encodeURIComponent(origin)}&challenge=${encodeURIComponent(challenge)}`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function readableError(error: unknown): string {
  if (error instanceof Error && error.name === 'TimeoutError') return 'O bridge local não respondeu a tempo.';
  if (error instanceof Error) return error.message;
  return 'Não foi possível conectar ao bridge local do Timewarp.';
}
