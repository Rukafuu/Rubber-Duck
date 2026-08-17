import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TimewarpTraceSummary } from '../../models/timewarp.model';
import { DebugSessionService } from '../../services/debug-session.service';
import { TimewarpService } from '../../services/timewarp.service';

@Component({
  selector: 'app-timewarp-connector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule],
  template: `
    <button
      type="button"
      (click)="open.set(true)"
      class="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors relative"
      title="Conectar ao Timewarp"
    >
      <mat-icon class="text-sm">hub</mat-icon>
      @if (timewarp.connectionState() === 'connected') {
        <span class="absolute -right-0.5 -top-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-zinc-900"></span>
      }
    </button>

    @if (open()) {
      <div class="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <section
          class="w-full max-w-xl max-h-[85vh] overflow-y-auto custom-scrollbar bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl text-zinc-100"
        >
          <header class="p-4 border-b border-zinc-800 flex items-start justify-between gap-4">
            <div class="flex gap-3">
              <div class="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
                <mat-icon class="text-sky-300">hub</mat-icon>
              </div>
              <div>
                <h2 class="font-bold text-sm">Timewarp</h2>
                <p class="text-[11px] text-zinc-400 mt-0.5">Importe evidências causais redigidas do seu ambiente local.</p>
              </div>
            </div>
            <button type="button" (click)="close()" class="text-zinc-500 hover:text-zinc-200"><mat-icon>close</mat-icon></button>
          </header>

          <div class="p-4 space-y-4 text-xs">
            @if (timewarp.connectionState() !== 'connected') {
              <div class="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[11px] text-zinc-400 leading-relaxed">
                Inicie localmente com <code class="text-sky-300">timewarp bridge</code> e informe o token exibido no terminal. O token fica apenas na memória desta aba.
              </div>
              <label class="block space-y-1">
                <span class="text-[11px] font-semibold text-zinc-400">URL local</span>
                <input [(ngModel)]="bridgeUrl" class="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono focus:border-sky-500 outline-none" />
              </label>
              <label class="block space-y-1">
                <span class="text-[11px] font-semibold text-zinc-400">Token de pareamento</span>
                <input [(ngModel)]="pairingToken" type="password" autocomplete="off" class="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono focus:border-sky-500 outline-none" />
              </label>
              @if (timewarp.error()) {
                <p class="text-rose-300 bg-rose-950/30 border border-rose-900 rounded-lg p-2">{{ timewarp.error() }}</p>
              }
              <button type="button" (click)="connect()" [disabled]="busy()" class="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 font-semibold">
                {{ busy() ? 'Conectando…' : 'Conectar ao bridge local' }}
              </button>
            } @else {
              <div class="flex items-center justify-between rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-3">
                <div class="flex items-center gap-2 text-emerald-300"><mat-icon class="text-sm">check_circle</mat-icon><span>Bridge conectado</span></div>
                <button type="button" (click)="disconnect()" class="text-[11px] text-zinc-400 hover:text-zinc-200">Desconectar</button>
              </div>

              @if (!canReadTraces()) {
                <div class="space-y-3 rounded-xl border border-amber-800/50 bg-amber-950/20 p-3">
                  <div>
                    <div class="font-semibold text-amber-300">Consentimento necessário</div>
                    <p class="mt-1 text-[11px] text-zinc-400">O Rubber Duck solicitará somente <code>trace:read</code>. A aprovação continua fora do navegador.</p>
                  </div>
                  @if (!timewarp.pendingConsent()) {
                    <button type="button" (click)="requestConsent()" [disabled]="busy()" class="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 font-semibold text-white">Solicitar acesso temporário</button>
                  } @else {
                    <div class="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-2">
                      <div class="text-[10px] uppercase tracking-wider text-zinc-500">Execute e confirme no terminal</div>
                      <code class="block text-[11px] text-amber-200 break-all">{{ timewarp.pendingConsent()!.operator_action }}</code>
                    </div>
                    <button type="button" (click)="verifyConsent()" [disabled]="busy()" class="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 font-semibold">Já aprovei — verificar novamente</button>
                  }
                </div>
              } @else {
                <div class="flex gap-2">
                  <input [(ngModel)]="serviceFilter" placeholder="Filtrar por serviço (opcional)" class="flex-1 min-w-0 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-sky-500" />
                  <button type="button" (click)="loadTraces()" [disabled]="busy()" class="px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"><mat-icon class="text-sm">refresh</mat-icon></button>
                </div>
                <div class="space-y-2">
                  @for (trace of timewarp.traces(); track trace.TraceID) {
                    <article class="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex items-center justify-between gap-3">
                      <div class="min-w-0">
                        <div class="font-semibold text-zinc-200 truncate">{{ trace.RootService || 'Serviço desconhecido' }}</div>
                        <div class="font-mono text-[10px] text-zinc-500 truncate mt-1">{{ trace.TraceID }}</div>
                        <div class="flex gap-2 mt-1.5 text-[10px] text-zinc-400">
                          <span [class]="trace.Status === 'ERROR' ? 'text-rose-300' : 'text-emerald-300'">{{ trace.Status }}</span>
                          <span>{{ trace.EventCount }} eventos</span>
                          <span>{{ trace.DurationMS }} ms</span>
                        </div>
                      </div>
                      <button type="button" (click)="importTrace(trace)" [disabled]="busy()" class="shrink-0 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[11px] font-semibold">Importar</button>
                    </article>
                  } @empty {
                    <div class="text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl py-8">Nenhum trace carregado.</div>
                  }
                </div>
              }
              @if (actionError()) {
                <p class="text-rose-300 bg-rose-950/30 border border-rose-900 rounded-lg p-2">{{ actionError() }}</p>
              }
            }
          </div>
        </section>
      </div>
    }
  `,
})
export class TimewarpConnectorComponent {
  readonly timewarp = inject(TimewarpService);
  private readonly sessions = inject(DebugSessionService);

  open = signal(false);
  busy = signal(false);
  actionError = signal('');
  bridgeUrl = 'http://127.0.0.1:7779';
  pairingToken = '';
  serviceFilter = '';

  canReadTraces(): boolean {
    return this.timewarp.capabilities()?.approved_scopes.includes('trace:read') ?? false;
  }

  async connect(): Promise<void> {
    await this.run(async () => {
      await this.timewarp.connect(this.bridgeUrl, this.pairingToken);
      if (this.canReadTraces()) await this.timewarp.searchTraces();
      this.pairingToken = '';
    });
  }

  async requestConsent(): Promise<void> {
    await this.run(() => this.timewarp.requestTraceConsent());
  }

  async verifyConsent(): Promise<void> {
    await this.run(async () => {
      await this.timewarp.refreshCapabilities();
      if (!this.canReadTraces()) throw new Error('A concessão ainda não está ativa no Timewarp.');
      await this.timewarp.searchTraces(this.serviceFilter);
    });
  }

  async loadTraces(): Promise<void> {
    await this.run(() => this.timewarp.searchTraces(this.serviceFilter));
  }

  async importTrace(trace: TimewarpTraceSummary): Promise<void> {
    await this.run(async () => {
      const bundle = await this.timewarp.loadTraceBundle(trace);
      await this.sessions.importTimewarpTrace(bundle);
      this.close();
    });
  }

  disconnect(): void {
    this.timewarp.disconnect();
  }

  close(): void {
    this.open.set(false);
    this.actionError.set('');
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    this.busy.set(true);
    this.actionError.set('');
    try {
      await action();
    } catch (error) {
      this.actionError.set(error instanceof Error ? error.message : 'A operação com o Timewarp falhou.');
    } finally {
      this.busy.set(false);
    }
  }
}
