import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DebugSessionService } from '../../services/debug-session.service';
import { DebugTest, TestVerdict } from '../../models/debug.model';

@Component({
  selector: 'app-tests-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-zinc-900 border-l border-zinc-800 text-zinc-100">
      
      <!-- Header -->
      <div class="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
        <div class="flex items-center gap-2">
          <mat-icon class="text-emerald-400 text-base">terminal</mat-icon>
          <span class="text-xs font-bold uppercase tracking-wider text-zinc-200">Testes & Diagnósticos</span>
          <span class="px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono">
            {{ activeSession()?.tests?.length || 0 }}
          </span>
        </div>

        <button
          (click)="showAddForm.set(!showAddForm())"
          class="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs flex items-center gap-1 border border-zinc-700 transition-colors"
        >
          <mat-icon class="text-xs">{{ showAddForm() ? 'close' : 'add' }}</mat-icon>
          <span>{{ showAddForm() ? 'Cancelar' : 'Novo Teste' }}</span>
        </button>
      </div>

      <!-- Add Test Form -->
      @if (showAddForm()) {
        <form [formGroup]="testForm" (ngSubmit)="onAddTest()" class="p-3.5 bg-zinc-950 border-b border-zinc-800 space-y-3">
          <div class="text-xs font-semibold text-emerald-400">Propor Comando / Teste Diagnóstico</div>

          <div>
            <span class="block text-[11px] text-zinc-400 mb-1">Comando ou Ação de Teste *</span>
            <input
              type="text"
              formControlName="command"
              placeholder="Ex: npm ls glob || npx expo-doctor"
              class="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg font-mono text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <span class="block text-[11px] text-zinc-400 mb-1">Propósito / O que este teste investiga *</span>
            <input
              type="text"
              formControlName="purpose"
              placeholder="Ex: Identificar versões concorrentes do pacote"
              class="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <span class="block text-[11px] text-zinc-400 mb-1">Resultado Esperado se a Hipótese for Verdadeira</span>
            <input
              type="text"
              formControlName="expectedOutput"
              placeholder="Ex: glob@10.x instalado ao lado de glob@7.x"
              class="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          @if (activeSession()?.hypotheses?.length) {
            <div>
              <span class="block text-[11px] text-zinc-400 mb-1">Vincular à Hipótese (Opcional)</span>
              <select
                formControlName="hypothesisId"
                class="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Nenhuma hipótese específica --</option>
                @for (hyp of activeSession()?.hypotheses; track hyp.id) {
                  <option [value]="hyp.id">{{ hyp.title }}</option>
                }
              </select>
            </div>
          }

          <div class="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              [disabled]="testForm.invalid"
              class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
            >
              Registrar Teste
            </button>
          </div>
        </form>
      }

      <!-- Result Recording Modal / Drawer -->
      @if (recordingTest()) {
        <div class="p-3.5 bg-zinc-950 border-b border-zinc-800 space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <mat-icon class="text-sm">input</mat-icon>
              <span>Registrar Saída do Teste</span>
            </div>
            <button (click)="recordingTest.set(null)" class="text-zinc-400 hover:text-zinc-200">
              <mat-icon class="text-xs">close</mat-icon>
            </button>
          </div>

          <div class="p-2 rounded bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-emerald-400">
            $ {{ recordingTest()!.command }}
          </div>

          <div>
            <span class="block text-[11px] text-zinc-400 mb-1">Saída / Logs do Terminal *</span>
            <textarea
              [formControl]="outputControl"
              rows="3"
              placeholder="Cole a resposta obtida no seu terminal..."
              class="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            ></textarea>
          </div>

          <div>
            <span class="block text-[11px] text-zinc-400 mb-1">Veredito Inicial</span>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                (click)="selectedVerdict.set('supports')"
                [class]="selectedVerdict() === 'supports' ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'"
                class="px-2 py-1 text-xs rounded border text-center font-medium"
              >
                Apoia Hipótese
              </button>
              <button
                type="button"
                (click)="selectedVerdict.set('contradicts')"
                [class]="selectedVerdict() === 'contradicts' ? 'bg-rose-950 border-rose-500 text-rose-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'"
                class="px-2 py-1 text-xs rounded border text-center font-medium"
              >
                Contradiz
              </button>
              <button
                type="button"
                (click)="selectedVerdict.set('inconclusive')"
                [class]="selectedVerdict() === 'inconclusive' ? 'bg-zinc-800 border-zinc-600 text-zinc-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'"
                class="px-2 py-1 text-xs rounded border text-center font-medium"
              >
                Inconclusivo
              </button>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-1">
            <button
              (click)="recordingTest.set(null)"
              class="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
            <button
              (click)="saveRecordedResult()"
              [disabled]="isSavingResult() || !outputControl.value.trim()"
              class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              @if (isSavingResult()) {
                <mat-icon class="text-xs animate-spin">refresh</mat-icon>
                <span>Analisando com IA...</span>
              } @else {
                <span>Confirmar & Analisar Evidência</span>
              }
            </button>
          </div>
        </div>
      }

      <!-- List of Tests -->
      <div class="flex-1 overflow-y-auto p-3.5 space-y-2.5 custom-scrollbar">
        @if (!activeSession()?.tests?.length) {
          <div class="p-6 text-center text-zinc-500 space-y-2">
            <mat-icon class="text-3xl text-zinc-600">science</mat-icon>
            <div class="text-xs">Nenhum teste diagnóstico registrado</div>
            <p class="text-[11px] text-zinc-600">
              Proponha comandos pontuais para confirmar ou descartar hipóteses isoladas.
            </p>
          </div>
        }

        @for (test of activeSession()?.tests; track test.id) {
          <div
            class="p-3 rounded-xl border text-xs space-y-2 transition-all"
            [class]="getTestCardClass(test)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="font-mono text-zinc-200 bg-zinc-950 px-2 py-1 rounded border border-zinc-800 flex-1 truncate">
                $ {{ test.command }}
              </div>
              <div class="flex items-center gap-1">
                <span
                  class="font-mono text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                  [class]="getTestStatusBadgeClass(test)"
                >
                  {{ test.status }}
                </span>
                <button
                  (click)="deleteTest(test.id)"
                  class="text-zinc-500 hover:text-rose-400 p-0.5 rounded"
                  title="Remover teste"
                >
                  <mat-icon class="text-xs">delete</mat-icon>
                </button>
              </div>
            </div>

            <div class="text-zinc-400 text-[11px] space-y-0.5">
              <div><strong class="text-zinc-300">Propósito:</strong> {{ test.purpose }}</div>
              @if (test.expectedOutput) {
                <div><strong class="text-zinc-300">Esperado:</strong> {{ test.expectedOutput }}</div>
              }
            </div>

            <!-- If completed, show verdict & output -->
            @if (test.status === 'completed') {
              <div class="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] space-y-1.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1">
                    <mat-icon class="text-xs" [class]="getVerdictTextClass(test.verdict)">
                      {{ test.verdict === 'supports' ? 'check_circle' : test.verdict === 'contradicts' ? 'cancel' : 'help' }}
                    </mat-icon>
                    <span class="font-bold uppercase tracking-wider" [class]="getVerdictTextClass(test.verdict)">
                      Veredito: {{ test.verdict }}
                    </span>
                  </div>
                </div>

                @if (test.actualOutput) {
                  <div>
                    <span class="text-zinc-500">Saída Registrada:</span>
                    <pre class="font-mono text-[10px] text-zinc-300 whitespace-pre-wrap max-h-24 overflow-y-auto custom-scrollbar mt-0.5">{{ test.actualOutput }}</pre>
                  </div>
                }

                @if (test.aiAnalysis) {
                  <div class="pt-1 border-t border-zinc-800/60 text-zinc-300 italic">
                    <span class="text-zinc-500 not-italic font-semibold">Análise de Evidência:</span> {{ test.aiAnalysis }}
                  </div>
                }
              </div>
            } @else {
              <div class="flex items-center justify-between pt-1">
                <span class="text-[11px] text-zinc-500 italic">Aguardando execução no terminal</span>
                <button
                  (click)="startRecordingResult(test)"
                  class="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors border border-zinc-700"
                >
                  <mat-icon class="text-xs text-amber-400">add_task</mat-icon>
                  <span>Registrar Saída</span>
                </button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class TestsPanelComponent {
  private sessionService = inject(DebugSessionService);

  readonly activeSession = this.sessionService.activeSession;

  showAddForm = signal<boolean>(false);
  recordingTest = signal<DebugTest | null>(null);
  selectedVerdict = signal<TestVerdict>('supports');
  isSavingResult = signal<boolean>(false);

  outputControl = new FormControl('', { nonNullable: true });

  testForm = new FormGroup({
    command: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    purpose: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    expectedOutput: new FormControl('', { nonNullable: true }),
    hypothesisId: new FormControl('', { nonNullable: true }),
  });

  onAddTest() {
    if (this.testForm.invalid) return;

    const val = this.testForm.getRawValue();
    this.sessionService.addTest({
      command: val.command.trim(),
      purpose: val.purpose.trim(),
      expectedOutput: val.expectedOutput.trim() || undefined,
      hypothesisId: val.hypothesisId || undefined,
      status: 'pending',
    });

    this.testForm.reset();
    this.showAddForm.set(false);
  }

  deleteTest(testId: string) {
    this.sessionService.deleteTest(testId);
  }

  startRecordingResult(test: DebugTest) {
    this.recordingTest.set(test);
    this.outputControl.setValue(test.actualOutput || '');
    this.selectedVerdict.set(test.verdict || 'supports');
  }

  async saveRecordedResult() {
    const test = this.recordingTest();
    const output = this.outputControl.value.trim();
    if (!test || !output) return;

    this.isSavingResult.set(true);
    try {
      await this.sessionService.recordTestResult(
        test.id,
        output,
        this.selectedVerdict()
      );
      this.recordingTest.set(null);
      this.outputControl.setValue('');
    } finally {
      this.isSavingResult.set(false);
    }
  }

  getTestCardClass(t: DebugTest): string {
    if (t.status === 'completed') {
      return t.verdict === 'supports'
        ? 'bg-emerald-950/20 border-emerald-500/40'
        : t.verdict === 'contradicts'
        ? 'bg-rose-950/20 border-rose-500/40'
        : 'bg-zinc-950/40 border-zinc-800';
    }
    return 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700';
  }

  getTestStatusBadgeClass(t: DebugTest): string {
    switch (t.status) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      case 'running': return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      default: return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  }

  getVerdictTextClass(v?: TestVerdict): string {
    switch (v) {
      case 'supports': return 'text-emerald-400';
      case 'contradicts': return 'text-rose-400';
      default: return 'text-amber-400';
    }
  }
}
