import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DebugSessionService } from '../../services/debug-session.service';

@Component({
  selector: 'app-secret-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    @if (activeSession() && activeSession()!.secretsDetected.length > 0) {
      <div class="bg-rose-950/80 border-b border-rose-800 text-rose-200 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 z-10">
        <div class="flex items-center gap-2">
          <mat-icon class="text-rose-400 text-base">shield_lock</mat-icon>
          <span class="font-semibold text-rose-300">
            Alerta de Segurança: {{ activeSession()!.secretsDetected.length }} possível(is) credencial(is) detectada(s) nos logs ou mensagens!
          </span>
          <div class="hidden md:flex items-center gap-1.5 ml-2">
            @for (item of activeSession()!.secretsDetected.slice(0, 2); track $index) {
              <span class="bg-rose-900/60 border border-rose-700/60 text-rose-300 font-mono text-[11px] px-1.5 py-0.5 rounded">
                {{ item.type }}: {{ item.maskedPreview }}
              </span>
            }
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-rose-300/80 text-[11px] hidden sm:inline">Nunca compartilhe chaves privadas em logs.</span>
          <button
            (click)="redactSecrets()"
            class="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded text-[11px] flex items-center gap-1 transition-colors"
          >
            <mat-icon class="text-xs">visibility_off</mat-icon>
            <span>Redigir & Mascarar Segredos</span>
          </button>
        </div>
      </div>
    }
  `,
})
export class SecretBannerComponent {
  private sessionService = inject(DebugSessionService);
  readonly activeSession = this.sessionService.activeSession;

  redactSecrets() {
    this.sessionService.redactSecretsInActiveSession();
  }
}
