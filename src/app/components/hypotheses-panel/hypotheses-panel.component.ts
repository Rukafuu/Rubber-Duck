import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DebugSessionService } from '../../services/debug-session.service';
import { ConfidenceScore, Hypothesis, HypothesisStatus } from '../../models/debug.model';

@Component({
  selector: 'app-hypotheses-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-zinc-900 border-l border-zinc-800 text-zinc-100">
      
      <!-- Panel Header -->
      <div class="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
        <div class="flex items-center gap-2">
          <mat-icon class="text-sky-400 text-base">radar</mat-icon>
          <span class="text-xs font-bold uppercase tracking-wider text-zinc-200">Sistema de Hipóteses</span>
          <span class="px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono">
            {{ activeSession()?.hypotheses?.length || 0 }}
          </span>
        </div>

        <button
          (click)="showAddForm.set(!showAddForm())"
          class="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs flex items-center gap-1 border border-zinc-700 transition-colors"
        >
          <mat-icon class="text-xs">{{ showAddForm() ? 'close' : 'add' }}</mat-icon>
          <span>{{ showAddForm() ? 'Cancelar' : 'Propor Hipótese' }}</span>
        </button>
      </div>

      <!-- Add Hypothesis Collapsible Form -->
      @if (showAddForm()) {
        <form [formGroup]="form" (ngSubmit)="onAddHypothesis()" class="p-3.5 bg-zinc-950 border-b border-zinc-800 space-y-3">
          <div class="text-xs font-semibold text-sky-400">Nova Hipótese Falseável</div>
          
          <div>
            <span class="block text-[11px] text-zinc-400 mb-1">Título da Hipótese *</span>
            <input
              type="text"
              formControlName="title"
              placeholder="Ex: Conflito entre Node 20 e dependência glob"
              class="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <span class="block text-[11px] text-zinc-400 mb-1">Justificativa / Racional Técnico *</span>
            <textarea
              formControlName="rationale"
              rows="2"
              placeholder="Por que essa hipótese é plausível com base nos sintomas?"
              class="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
            ></textarea>
          </div>

          <div>
            <span class="block text-[11px] text-zinc-400 mb-1">Grau de Confiança Inicial</span>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                (click)="setConfidence('low')"
                [class]="form.controls.confidence.value === 'low' ? 'bg-zinc-800 text-amber-300 border-amber-500/50' : 'bg-zinc-900 text-zinc-400 border-zinc-800'"
                class="px-2 py-1 text-xs rounded border text-center font-medium"
              >
                Baixa
              </button>
              <button
                type="button"
                (click)="setConfidence('medium')"
                [class]="form.controls.confidence.value === 'medium' ? 'bg-zinc-800 text-sky-300 border-sky-500/50' : 'bg-zinc-900 text-zinc-400 border-zinc-800'"
                class="px-2 py-1 text-xs rounded border text-center font-medium"
              >
                Média
              </button>
              <button
                type="button"
                (click)="setConfidence('high')"
                [class]="form.controls.confidence.value === 'high' ? 'bg-zinc-800 text-emerald-300 border-emerald-500/50' : 'bg-zinc-900 text-zinc-400 border-zinc-800'"
                class="px-2 py-1 text-xs rounded border text-center font-medium"
              >
                Alta
              </button>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              [disabled]="form.invalid"
              class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
            >
              Registrar Hipótese
            </button>
          </div>
        </form>
      }

      <!-- Hypotheses List -->
      <div class="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
        @if (activeSession()?.hypotheses?.length === 0) {
          <div class="p-6 text-center text-zinc-500 space-y-2">
            <mat-icon class="text-3xl text-zinc-600">lightbulb_outline</mat-icon>
            <div class="text-xs font-medium">Nenhuma hipótese formulada ainda.</div>
            <div class="text-[11px] text-zinc-500">Envie logs ou inicie o chat com a IA para estruturar as primeiras hipóteses falseáveis.</div>
          </div>
        }

        @for (hyp of activeSession()?.hypotheses; track hyp.id) {
          <div
            class="p-3.5 rounded-xl border transition-all text-xs space-y-2.5"
            [class]="getCardClass(hyp)"
          >
            <!-- Title and Badges -->
            <div class="flex items-start justify-between gap-2">
              <div class="font-semibold text-zinc-100 flex-1 leading-snug">
                {{ hyp.title }}
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span
                  class="font-mono text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                  [class]="getStatusBadgeClass(hyp.status)"
                >
                  {{ hyp.status }}
                </span>
              </div>
            </div>

            <!-- Rationale -->
            <p class="text-zinc-300 text-[11px] leading-relaxed">
              {{ hyp.rationale }}
            </p>

            <!-- Confidence Bar -->
            <div class="space-y-1 bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/80">
              <div class="flex items-center justify-between text-[10px]">
                <span class="text-zinc-400">Confiança da Evidência:</span>
                <span class="font-mono font-bold uppercase" [class]="getConfidenceTextClass(hyp.confidence)">
                  {{ hyp.confidence }}
                </span>
              </div>
              <div class="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  [class]="getConfidenceBarClass(hyp.confidence)"
                  [style.width]="getConfidenceWidth(hyp.confidence)"
                ></div>
              </div>
            </div>

            <!-- Supporting Evidence -->
            @if (hyp.supportingEvidence.length > 0) {
              <div class="space-y-1">
                <div class="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                  <mat-icon class="text-xs">thumb_up</mat-icon> Evidências Favoráveis
                </div>
                <ul class="space-y-0.5 text-[11px] text-zinc-300 pl-3 list-disc marker:text-emerald-500">
                  @for (ev of hyp.supportingEvidence; track $index) {
                    <li>{{ ev }}</li>
                  }
                </ul>
              </div>
            }

            <!-- Counter Evidence -->
            @if (hyp.counterEvidence.length > 0) {
              <div class="space-y-1">
                <div class="text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                  <mat-icon class="text-xs">thumb_down</mat-icon> Evidências Contrárias
                </div>
                <ul class="space-y-0.5 text-[11px] text-zinc-300 pl-3 list-disc marker:text-rose-500">
                  @for (cev of hyp.counterEvidence; track $index) {
                    <li>{{ cev }}</li>
                  }
                </ul>
              </div>
            }

            <!-- Elimination Reason if rejected -->
            @if (hyp.status === 'rejected' && hyp.eliminationReason) {
              <div class="p-2 rounded bg-rose-950/40 border border-rose-800/40 text-[11px] text-rose-300">
                <span class="font-semibold">Motivo do Descarte:</span> {{ hyp.eliminationReason }}
              </div>
            }

            <!-- Action Buttons -->
            <div class="pt-2 border-t border-zinc-800 flex items-center justify-between gap-1 flex-wrap">
              <div class="flex items-center gap-1">
                @if (hyp.status !== 'testing' && hyp.status !== 'confirmed') {
                  <button
                    (click)="updateStatus(hyp.id, 'testing')"
                    class="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-sky-300 flex items-center gap-1 border border-zinc-700"
                    title="Mover para teste ativo"
                  >
                    <mat-icon class="text-xs">play_arrow</mat-icon>
                    <span>Testar</span>
                  </button>
                }

                @if (hyp.status !== 'confirmed') {
                  <button
                    (click)="updateStatus(hyp.id, 'confirmed')"
                    class="px-2 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-[11px] text-emerald-300 flex items-center gap-1 border border-emerald-800"
                    title="Confirmar como causa raiz comprovada"
                  >
                    <mat-icon class="text-xs">check</mat-icon>
                    <span>Confirmar Causa</span>
                  </button>
                }
              </div>

              @if (hyp.status !== 'rejected') {
                <button
                  (click)="rejectHypothesis(hyp.id)"
                  class="px-2 py-1 rounded bg-rose-950/50 hover:bg-rose-900 text-[11px] text-rose-300 flex items-center gap-1 border border-rose-900"
                  title="Descartar hipótese por evidência contrária"
                >
                  <mat-icon class="text-xs">close</mat-icon>
                  <span>Descartar</span>
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class HypothesesPanelComponent {
  private sessionService = inject(DebugSessionService);
  readonly activeSession = this.sessionService.activeSession;

  showAddForm = signal<boolean>(false);

  form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(4)] }),
    rationale: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    confidence: new FormControl<ConfidenceScore>('medium', { nonNullable: true }),
  });

  setConfidence(c: ConfidenceScore) {
    this.form.patchValue({ confidence: c });
  }

  onAddHypothesis() {
    if (this.form.invalid) return;
    const { title, rationale, confidence } = this.form.getRawValue();
    this.sessionService.addHypothesis(title, rationale, confidence);
    this.form.reset({ confidence: 'medium' });
    this.showAddForm.set(false);
  }

  updateStatus(id: string, status: HypothesisStatus) {
    this.sessionService.updateHypothesisStatus(id, status);
  }

  rejectHypothesis(id: string) {
    const reason = prompt('Qual foi a evidência contrária que eliminou esta hipótese?');
    if (reason !== null) {
      this.sessionService.updateHypothesisStatus(id, 'rejected', reason || 'Contradita pelos resultados dos testes');
    }
  }

  getCardClass(hyp: Hypothesis): string {
    switch (hyp.status) {
      case 'confirmed': return 'bg-emerald-950/20 border-emerald-500/40 shadow-xs';
      case 'testing': return 'bg-sky-950/20 border-sky-500/40';
      case 'rejected': return 'bg-zinc-950/60 border-zinc-800 opacity-60';
      default: return 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700';
    }
  }

  getStatusBadgeClass(status: HypothesisStatus): string {
    switch (status) {
      case 'confirmed': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      case 'testing': return 'bg-sky-500/20 text-sky-300 border border-sky-500/30';
      case 'rejected': return 'bg-rose-500/20 text-rose-300 border border-rose-500/30 line-through';
      default: return 'bg-zinc-800 text-zinc-300 border border-zinc-700';
    }
  }

  getConfidenceTextClass(c: ConfidenceScore): string {
    switch (c) {
      case 'confirmed': return 'text-emerald-400';
      case 'high': return 'text-emerald-400';
      case 'medium': return 'text-sky-400';
      default: return 'text-amber-400';
    }
  }

  getConfidenceBarClass(c: ConfidenceScore): string {
    switch (c) {
      case 'confirmed': return 'bg-emerald-500';
      case 'high': return 'bg-emerald-500';
      case 'medium': return 'bg-sky-500';
      default: return 'bg-amber-500';
    }
  }

  getConfidenceWidth(c: ConfidenceScore): string {
    switch (c) {
      case 'confirmed': return '100%';
      case 'high': return '80%';
      case 'medium': return '50%';
      default: return '25%';
    }
  }
}
