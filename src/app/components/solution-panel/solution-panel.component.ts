import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DebugSessionService } from '../../services/debug-session.service';

@Component({
  selector: 'app-solution-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-zinc-900 border-l border-zinc-800 text-zinc-100">
      
      <!-- Header -->
      <div class="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
        <div class="flex items-center gap-2">
          <mat-icon class="text-emerald-400 text-base">verified</mat-icon>
          <span class="text-xs font-bold uppercase tracking-wider text-zinc-200">Playbook da Solução Validada</span>
        </div>

        @if (activeSession()?.status === 'solved') {
          <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase">
            Resolvido & Reutilizável
          </span>
        }
      </div>

      <!-- Content Body -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        
        <!-- If no solution synthesized yet -->
        @if (!activeSession()?.solution) {
          <div class="p-6 text-center space-y-3 bg-zinc-950/40 rounded-xl border border-zinc-800">
            <div class="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <mat-icon class="text-2xl">auto_fix_high</mat-icon>
            </div>
            <div class="space-y-1">
              <h3 class="text-sm font-bold text-zinc-200">Nenhum Playbook Sintetizado</h3>
              <p class="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Após testar e isolar a causa raiz através de hipóteses, gere uma solução estruturada com código, passos reprodutíveis e prevenção.
              </p>
            </div>
            <button
              (click)="generatePlaybook()"
              [disabled]="isGenerating()"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 mx-auto transition-all"
            >
              @if (isGenerating()) {
                <mat-icon class="text-sm animate-spin">refresh</mat-icon>
                <span>Sintetizando com IA...</span>
              } @else {
                <mat-icon class="text-sm">auto_fix_high</mat-icon>
                <span>Sintetizar Playbook de Solução</span>
              }
            </button>
          </div>
        } @else {
          
          <!-- Solution Card -->
          <div class="space-y-4">
            
            <!-- Root Cause -->
            <div class="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
              <div class="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <mat-icon class="text-xs">search</mat-icon>
                <span>Causa Raiz Comprovada</span>
              </div>
              <p class="text-xs text-zinc-200 leading-relaxed">
                {{ activeSession()!.solution!.rootCause }}
              </p>
            </div>

            <!-- Resolution Steps -->
            <div class="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
              <div class="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <mat-icon class="text-xs">checklist</mat-icon>
                <span>Passos da Resolução</span>
              </div>
              <ol class="space-y-1.5 text-xs text-zinc-300 pl-4 list-decimal marker:text-emerald-500 marker:font-bold">
                @for (step of activeSession()!.solution!.solutionSteps; track $index) {
                  <li class="leading-relaxed">{{ step }}</li>
                }
              </ol>
            </div>

            <!-- Code Fix -->
            @if (activeSession()!.solution!.codeFix) {
              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                  <div class="flex items-center gap-1">
                    <mat-icon class="text-xs">code</mat-icon>
                    <span>Código / Correção Aplicada</span>
                  </div>
                  <button
                    (click)="copyCode(activeSession()!.solution!.codeFix!)"
                    class="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-0.5 normal-case font-normal"
                  >
                    <mat-icon class="text-xs">{{ copied() ? 'done' : 'content_copy' }}</mat-icon>
                    <span>{{ copied() ? 'Copiado!' : 'Copiar' }}</span>
                  </button>
                </div>
                <div class="bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-[11px] text-emerald-300 whitespace-pre-wrap overflow-x-auto">
                  {{ activeSession()!.solution!.codeFix }}
                </div>
              </div>
            }

            <!-- Preventative Action -->
            @if (activeSession()!.solution!.preventativeAction) {
              <div class="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-1">
                <div class="font-bold text-purple-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
                  <mat-icon class="text-xs">security</mat-icon>
                  <span>Prevenção & Regras de CI</span>
                </div>
                <p class="text-zinc-400 leading-relaxed">
                  {{ activeSession()!.solution!.preventativeAction }}
                </p>
              </div>
            }

            <!-- Version Matrix -->
            <div class="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs space-y-1.5">
              <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Compatibilidade de Versões</div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-zinc-500">Versão Afetada:</span>
                <span class="font-mono text-rose-300 font-medium">
                  {{ activeSession()!.solution!.affectedVersions.join(', ') || activeSession()!.environment.version }}
                </span>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-zinc-500">Versão Confirmada:</span>
                <span class="font-mono text-emerald-300 font-medium">
                  {{ activeSession()!.solution!.confirmedVersions.join(', ') || activeSession()!.environment.version }}
                </span>
              </div>
            </div>

            <!-- Confirmation Action -->
            @if (!activeSession()!.solution!.userConfirmed) {
              <div class="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-3">
                <div class="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                  <mat-icon class="text-base">verified</mat-icon>
                  <span>Essa solução funcionou no seu projeto?</span>
                </div>
                <p class="text-[11px] text-zinc-400">
                  Ao confirmar, essa investigação é promovida a Solução Testada e indexada na Base Coletiva de Conhecimento.
                </p>
                <button
                  (click)="confirmSolution()"
                  class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition-colors"
                >
                  <mat-icon class="text-sm">thumb_up</mat-icon>
                  <span>Eu confirmo que isso resolveu meu problema</span>
                </button>
              </div>
            } @else {
              <div class="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 text-emerald-300">
                  <mat-icon class="text-base text-emerald-400">check_circle</mat-icon>
                  <div>
                    <div class="font-bold">Solução Validada pelo Usuário</div>
                    <div class="text-[10px] text-zinc-400">Publicada na Base de Conhecimento Coletiva</div>
                  </div>
                </div>
              </div>
            }

            <div class="pt-2 flex justify-center">
              <button
                (click)="generatePlaybook()"
                class="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
              >
                <mat-icon class="text-xs">refresh</mat-icon>
                <span>Regenerar Playbook com IA</span>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class SolutionPanelComponent {
  private sessionService = inject(DebugSessionService);
  readonly activeSession = this.sessionService.activeSession;

  isGenerating = signal<boolean>(false);
  copied = signal<boolean>(false);

  async generatePlaybook() {
    this.isGenerating.set(true);
    try {
      await this.sessionService.generateSolutionPlaybook();
    } finally {
      this.isGenerating.set(false);
    }
  }

  confirmSolution() {
    const note = prompt('Deseja adicionar uma nota técnica para a comunidade? (Opcional)');
    this.sessionService.confirmSolution(note || undefined);
  }

  copyCode(code: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }
}
