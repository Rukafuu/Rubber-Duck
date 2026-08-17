import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DebugSessionService } from '../../services/debug-session.service';
import { DebugMode } from '../../models/debug.model';
import { scanForSecrets } from '../../utils/secret-scanner';

@Component({
  selector: 'app-new-session-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100 animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <mat-icon class="text-xl">add_circle_outline</mat-icon>
            </div>
            <div>
              <h2 class="text-base font-bold tracking-tight">Nova Sessão de Investigação Colaborativa</h2>
              <p class="text-xs text-zinc-400">Estruture seu problema para depuração científica com hipóteses e testes</p>
            </div>
          </div>

          <button
            type="button"
            (click)="modalClose.emit()"
            class="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <mat-icon class="text-lg">close</mat-icon>
          </button>
        </div>

        <!-- Form Body -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          
          <!-- Problem Title -->
          <div>
            <span class="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Título do Problema <span class="text-rose-400">*</span>
            </span>
            <input
              type="text"
              formControlName="title"
              placeholder="Ex: Meu build do Expo começou a falhar após atualizar o SDK"
              class="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>

          <!-- Mode Selector (4 modes) -->
          <div>
            <span class="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Modo de Debugging <span class="text-rose-400">*</span>
            </span>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <!-- Rubber Duck -->
              <button
                type="button"
                (click)="setMode('rubber-duck')"
                [class]="selectedMode() === 'rubber-duck' ? 'border-amber-500 bg-amber-500/10 text-amber-200' : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'"
                class="p-3 rounded-xl border text-left flex flex-col justify-between transition-all"
              >
                <div class="flex items-center justify-between w-full mb-1">
                  <span class="font-semibold text-xs text-amber-400 flex items-center gap-1">
                    <mat-icon class="text-sm">psychology</mat-icon> Rubber Duck
                  </span>
                  @if (selectedMode() === 'rubber-duck') {
                    <mat-icon class="text-xs text-amber-400">check_circle</mat-icon>
                  }
                </div>
                <p class="text-[11px] leading-tight text-zinc-400">
                  Faz perguntas para guiar seu raciocínio, sem dar a resposta direta.
                </p>
              </button>

              <!-- Debugger -->
              <button
                type="button"
                (click)="setMode('debugger')"
                [class]="selectedMode() === 'debugger' ? 'border-sky-500 bg-sky-500/10 text-sky-200' : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'"
                class="p-3 rounded-xl border text-left flex flex-col justify-between transition-all"
              >
                <div class="flex items-center justify-between w-full mb-1">
                  <span class="font-semibold text-xs text-sky-400 flex items-center gap-1">
                    <mat-icon class="text-sm">radar</mat-icon> Debugger
                  </span>
                  @if (selectedMode() === 'debugger') {
                    <mat-icon class="text-xs text-sky-400">check_circle</mat-icon>
                  }
                </div>
                <p class="text-[11px] leading-tight text-zinc-400">
                  Formula hipóteses explícitas, propõe testes e calcula probabilidades.
                </p>
              </button>

              <!-- Mentor -->
              <button
                type="button"
                (click)="setMode('mentor')"
                [class]="selectedMode() === 'mentor' ? 'border-purple-500 bg-purple-500/10 text-purple-200' : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'"
                class="p-3 rounded-xl border text-left flex flex-col justify-between transition-all"
              >
                <div class="flex items-center justify-between w-full mb-1">
                  <span class="font-semibold text-xs text-purple-400 flex items-center gap-1">
                    <mat-icon class="text-sm">school</mat-icon> Mentor
                  </span>
                  @if (selectedMode() === 'mentor') {
                    <mat-icon class="text-xs text-purple-400">check_circle</mat-icon>
                  }
                </div>
                <p class="text-[11px] leading-tight text-zinc-400">
                  Explica profundamente os conceitos internos do runtime e arquitetura.
                </p>
              </button>

              <!-- Incident -->
              <button
                type="button"
                (click)="setMode('incident')"
                [class]="selectedMode() === 'incident' ? 'border-rose-500 bg-rose-500/10 text-rose-200' : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'"
                class="p-3 rounded-xl border text-left flex flex-col justify-between transition-all"
              >
                <div class="flex items-center justify-between w-full mb-1">
                  <span class="font-semibold text-xs text-rose-400 flex items-center gap-1">
                    <mat-icon class="text-sm">emergency</mat-icon> Incident P0
                  </span>
                  @if (selectedMode() === 'incident') {
                    <mat-icon class="text-xs text-rose-400">check_circle</mat-icon>
                  }
                </div>
                <p class="text-[11px] leading-tight text-zinc-400">
                  Foco absoluto em estancar impacto e restaurar o serviço em produção.
                </p>
              </button>
            </div>
          </div>

          <!-- Stack Presets Chips -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Presets de Stack Rápida
              </span>
              <span class="text-[11px] text-zinc-500">Preenche automaticamente o ambiente</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              @for (preset of stackPresets; track preset.name) {
                <button
                  type="button"
                  (click)="applyPreset(preset)"
                  class="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 hover:text-zinc-100 transition-colors flex items-center gap-1"
                >
                  <span>{{ preset.name }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Environment Details Grid -->
          <div class="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3" formGroupName="environment">
            <div class="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <mat-icon class="text-sm text-emerald-400">tune</mat-icon>
              <span>Metadados do Ambiente de Execução</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span class="block text-[11px] font-medium text-zinc-400 mb-1">Linguagem</span>
                <input
                  type="text"
                  formControlName="language"
                  placeholder="TypeScript"
                  class="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <span class="block text-[11px] font-medium text-zinc-400 mb-1">Framework</span>
                <input
                  type="text"
                  formControlName="framework"
                  placeholder="Expo / Next.js / Express"
                  class="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <span class="block text-[11px] font-medium text-zinc-400 mb-1">Runtime & Versão</span>
                <input
                  type="text"
                  formControlName="version"
                  placeholder="Node v20.12.0"
                  class="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span class="block text-[11px] font-medium text-zinc-400 mb-1">Sistema Operacional</span>
                <input
                  type="text"
                  formControlName="os"
                  placeholder="Linux Ubuntu / macOS / Windows"
                  class="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <span class="block text-[11px] font-medium text-zinc-400 mb-1">Estágio onde Ocorre</span>
                <select
                  formControlName="targetEnv"
                  class="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="build">Build / Compilação Estática</option>
                  <option value="runtime">Runtime (Execução do Processo)</option>
                  <option value="ci">CI/CD Pipeline</option>
                  <option value="production">Produção Ativa</option>
                  <option value="local">Ambiente Local de Dev</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Problem Description -->
          <div>
            <span class="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Descrição do Comportamento Observado vs Esperado <span class="text-rose-400">*</span>
            </span>
            <textarea
              formControlName="description"
              rows="3"
              placeholder="Descreva o que deveria acontecer, o que está acontecendo e quais tentativas anteriores você já realizou..."
              class="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            ></textarea>
          </div>

          <!-- Logs & Stack Trace with Secret Scanner Preview -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Logs / Stack Trace (Opcional)
              </span>
              @if (detectedSecretsCount() > 0) {
                <span class="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                  <mat-icon class="text-xs">shield</mat-icon>
                  {{ detectedSecretsCount() }} segredo(s) detectado(s)
                </span>
              }
            </div>
            <textarea
              formControlName="rawLogs"
              (input)="onLogsInput()"
              rows="4"
              placeholder="Cole os logs de erro do terminal, stack trace ou mensagens de build aqui..."
              class="w-full px-3.5 py-2.5 bg-zinc-950 font-mono text-xs text-zinc-200 placeholder-zinc-600 border border-zinc-700 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
            ></textarea>
          </div>

          <!-- First message to AI -->
          <div>
            <span class="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Mensagem Inicial para a IA
            </span>
            <input
              type="text"
              formControlName="initialMessage"
              placeholder="Ex: Como devo isolar esse problema sem quebrar a pipeline?"
              class="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <!-- Modal Footer -->
          <div class="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              (click)="modalClose.emit()"
              class="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="form.invalid || isSubmitting()"
              class="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              @if (isSubmitting()) {
                <mat-icon class="text-sm animate-spin">refresh</mat-icon>
                <span>Criando Investigação...</span>
              } @else {
                <mat-icon class="text-sm">science</mat-icon>
                <span>Iniciar Investigação</span>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class NewSessionModalComponent {
  private sessionService = inject(DebugSessionService);

  readonly modalClose = output<void>();

  selectedMode = signal<DebugMode>('debugger');
  isSubmitting = signal<boolean>(false);
  detectedSecretsCount = signal<number>(0);

  readonly stackPresets = [
    {
      name: 'Expo / React Native',
      language: 'TypeScript',
      framework: 'Expo',
      runtime: 'Hermes',
      version: 'SDK 51',
      os: 'macOS / Linux',
      targetEnv: 'build' as const,
    },
    {
      name: 'Node.js ESM / Backend',
      language: 'TypeScript',
      framework: 'Express / Fastify',
      runtime: 'Node.js',
      version: 'v20.12.0',
      os: 'Linux (Ubuntu)',
      targetEnv: 'runtime' as const,
    },
    {
      name: 'Next.js SSR',
      language: 'TypeScript',
      framework: 'Next.js 15 (App Router)',
      runtime: 'Node.js',
      version: '15.1.0',
      os: 'macOS',
      targetEnv: 'runtime' as const,
    },
    {
      name: 'Python / Django / FastAPI',
      language: 'Python',
      framework: 'FastAPI / SQLAlchemy',
      runtime: 'Python 3.12',
      version: 'FastAPI 0.111',
      os: 'Linux (Docker)',
      targetEnv: 'production' as const,
    },
  ];

  form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10)] }),
    rawLogs: new FormControl('', { nonNullable: true }),
    initialMessage: new FormControl('', { nonNullable: true }),
    environment: new FormGroup({
      language: new FormControl('TypeScript', { nonNullable: true }),
      framework: new FormControl('Expo / Node.js', { nonNullable: true }),
      runtime: new FormControl('Node.js', { nonNullable: true }),
      version: new FormControl('v20.x', { nonNullable: true }),
      os: new FormControl('Linux / macOS', { nonNullable: true }),
      targetEnv: new FormControl<'build' | 'runtime' | 'ci' | 'production' | 'local'>('build', { nonNullable: true }),
    }),
  });

  setMode(mode: DebugMode) {
    this.selectedMode.set(mode);
  }

  applyPreset(preset: typeof this.stackPresets[0]) {
    this.form.patchValue({
      environment: {
        language: preset.language,
        framework: preset.framework,
        runtime: preset.runtime,
        version: preset.version,
        os: preset.os,
        targetEnv: preset.targetEnv,
      },
    });
  }

  onLogsInput() {
    const logs = this.form.controls.rawLogs.value;
    const findings = scanForSecrets(logs);
    this.detectedSecretsCount.set(findings.length);
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.isSubmitting.set(true);
    const val = this.form.getRawValue();

    try {
      await this.sessionService.createSession({
        title: val.title,
        description: val.description,
        mode: this.selectedMode(),
        environment: val.environment,
        rawLogs: val.rawLogs,
        initialMessage: val.initialMessage || val.description,
      });

      this.modalClose.emit();
    } catch (e) {
      console.error('Failed to create session', e);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
