import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TimewarpService } from './timewarp.service';

describe('TimewarpService', () => {
  let service: TimewarpService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TimewarpService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('connects only to the loopback bridge with a bearer token', async () => {
    const connecting = service.connect('http://127.0.0.1:7779', 'pairing-token');
    const health = http.expectOne('http://127.0.0.1:7779/v1/health');
    expect(health.request.headers.get('Authorization')).toBe('Bearer pairing-token');
    health.flush({ status: 'ok' });

    await Promise.resolve();
    const capabilities = http.expectOne((request) => request.url.endsWith('/v1/capabilities'));
    expect(capabilities.request.params.get('session_id')).toContain('rubber-duck-');
    capabilities.flush({
      actor: 'rubber-duck', approved_scopes: [], supported_scopes: ['trace:read'],
      consent_mode: 'operator-approved-temporary-grants', mutation_tools: false,
      audit_trace_prefix: 'agent-session:',
    });

    await connecting;
    expect(service.connectionState()).toBe('connected');
  });

  it('rejects a non-loopback bridge before making a request', async () => {
    await expect(service.connect('https://timewarp.example', 'token')).rejects.toThrow(/URL HTTP local/);
    expect(service.connectionState()).toBe('error');
  });
});
