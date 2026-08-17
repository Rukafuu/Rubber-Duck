import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DebugSessionService } from '../../services/debug-session.service';

@Component({
  selector: 'app-investigation-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    @if (activeSession()) {
      <div class="bg-zinc-900 border-b border-zinc-800 p-4">
        <!-- Top Title & Quick Tags -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-base font-bold text-zinc-100 tracking-tight">
                {{ activeSession()!.title }}
              </h1>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap text-xs text-zinc-400">
              <span class="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px]">
                {{ activeSession()!.environment.language }}
              </span>
              <span class="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px]">
                {{ activeSession()!.environment.framework }}
              </span>
              <span class="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px]">
                {{ activeSession()!.environment.version }}
              </span>
              <span class="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono text-[11px]">
                {{ activeSession()!.environment.targetEnv }}
              </span>
            </div>
          </div>

          <!-- Quick Metrics -->
          <div class="flex items-center gap-2 text-xs">
            <div class="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center gap-1.5 text-zinc-300">
              <mat-icon class="text-sm text-sky-400">lightbulb</mat-icon>
              <span>{{ activeSession()!.hypotheses.length }} Hipóteses</span>
            </div>
            <div class="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center gap-1.5 text-zinc-300">
              <mat-icon class="text-sm text-emerald-400">terminal</mat-icon>
              <span>{{ activeSession()!.tests.length }} Testes</span>
            </div>
          </div>
        </div>

        <!-- Investigation Lifecycle Progress Bar -->
        <div class="grid grid-cols-5 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 text-[11px]">
          <!-- Step 1: Problem -->
          <div class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 font-medium">
            <mat-icon class="text-xs text-emerald-400">check_circle</mat-icon>
            <span class="truncate">1. Problema</span>
          </div>

          <!-- Step 2: Context -->
          <div
            class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
            [class]="activeSession()!.messages.length > 0 ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500'"
          >
            <mat-icon class="text-xs" [class.text-emerald-400]="activeSession()!.messages.length > 0">
              {{ activeSession()!.messages.length > 0 ? 'check_circle' : 'radio_button_unchecked' }}
            </mat-icon>
            <span class="truncate">2. Investigação</span>
          </div>

          <!-- Step 3: Hypotheses -->
          <div
            class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
            [class]="activeSession()!.hypotheses.length > 0 ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500'"
          >
            <mat-icon class="text-xs" [class.text-sky-400]="activeSession()!.hypotheses.length > 0">
              {{ activeSession()!.hypotheses.length > 0 ? 'check_circle' : 'radio_button_unchecked' }}
            </mat-icon>
            <span class="truncate">3. Hipóteses ({{ activeSession()!.hypotheses.length }})</span>
          </div>

          <!-- Step 4: Tests -->
          <div
            class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
            [class]="activeSession()!.tests.length > 0 ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500'"
          >
            <mat-icon class="text-xs" [class.text-amber-400]="activeSession()!.tests.length > 0">
              {{ activeSession()!.tests.length > 0 ? 'check_circle' : 'radio_button_unchecked' }}
            </mat-icon>
            <span class="truncate">4. Testes ({{ activeSession()!.tests.length }})</span>
          </div>

          <!-- Step 5: Solution -->
          <div
            class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
            [class]="activeSession()!.status === 'solved' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'text-zinc-500'"
          >
            <mat-icon class="text-xs" [class.text-emerald-400]="activeSession()!.status === 'solved'">
              {{ activeSession()!.status === 'solved' ? 'verified' : 'radio_button_unchecked' }}
            </mat-icon>
            <span class="truncate">5. Validada</span>
          </div>
        </div>
      </div>
    }
  `,
})
export class InvestigationBoardComponent {
  private sessionService = inject(DebugSessionService);
  readonly activeSession = this.sessionService.activeSession;
}
