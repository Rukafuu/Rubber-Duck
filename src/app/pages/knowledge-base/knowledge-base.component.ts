import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { KnowledgeBaseService } from '../../services/knowledge-base.service';
import { DebugSessionService } from '../../services/debug-session.service';
import { ConfidenceTier, KnowledgeEntry } from '../../models/debug.model';

@Component({
  selector: 'app-knowledge-base',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule],
  template: `
    <div class="min-h-[calc(100vh-3.5rem)] bg-zinc-950 text-zinc-100 p-6 sm:p-8 space-y-6">
      
      <!-- Hero / Header Section -->
      <div class="max-w-6xl mx-auto space-y-2">
        <div class="flex items-center gap-2 text-xs font-mono text-emerald-400">
          <mat-icon class="text-sm">verified</mat-icon>
          <span>BASE COLETIVA DE CONHECIMENTO TÉCNICO</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
          Soluções Comprovadas & Playbooks Reutilizáveis
        </h1>
        <p class="text-sm text-zinc-400 max-w-2xl leading-relaxed">
          Cada item nesta base foi investigado cientificamente com hipóteses, testes e confirmado em projetos reais. Elimine horas de tentativa e erro.
        </p>
      </div>

      <!-- Search & Filter Controls -->
      <div class="max-w-6xl mx-auto bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-xl space-y-3">
        <div class="flex flex-col sm:flex-row gap-3">
          <!-- Search Bar -->
          <div class="flex-1 relative">
            <mat-icon class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-base">search</mat-icon>
            <input
              type="text"
              [formControl]="searchControl"
              placeholder="Buscar por erro, framework, causa raiz ou palavras-chave (ex: Expo SDK 51, Glob ESM, CORS)..."
              class="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <!-- Tier Filter -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-zinc-400 whitespace-nowrap">Nível de Confiança:</span>
            <select
              [formControl]="tierControl"
              class="px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todos os Níveis</option>
              <option value="high">🌟 Alta Confiança (5+ Reproduções)</option>
              <option value="reproduced">✅ Reproduzido por Pares</option>
              <option value="tested">🧪 Testado</option>
            </select>
          </div>
        </div>

        <!-- Tag Filters -->
        <div class="flex items-center gap-1.5 flex-wrap pt-1 border-t border-zinc-800/60 text-xs">
          <span class="text-zinc-500 text-[11px]">Filtros Populares:</span>
          @for (tag of popularTags; track tag) {
            <button
              (click)="applyTagFilter(tag)"
              class="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px] transition-colors"
            >
              #{{ tag }}
            </button>
          }
        </div>
      </div>

      <!-- Entries Grid -->
      <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        @if (filteredEntries().length === 0) {
          <div class="col-span-full p-12 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-2">
            <mat-icon class="text-4xl text-zinc-600">search_off</mat-icon>
            <div class="text-sm font-semibold text-zinc-300">Nenhuma solução encontrada para os filtros</div>
            <div class="text-xs">Tente termos mais genéricos ou limpe a busca.</div>
          </div>
        }

        @for (entry of filteredEntries(); track entry.id) {
          <div class="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4 transition-all group">
            
            <!-- Card Top: Tags & Confidence Tier -->
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-mono text-[10px] px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-300">
                    {{ entry.environment.framework }}
                  </span>
                  <span class="font-mono text-[10px] px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-400">
                    {{ entry.environment.version }}
                  </span>
                </div>

                <div
                  class="font-mono text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"
                  [class]="getTierBadgeClass(entry.confidenceTier)"
                >
                  <mat-icon class="text-xs">{{ getTierIcon(entry.confidenceTier) }}</mat-icon>
                  <span>{{ entry.confidenceTier }}</span>
                </div>
              </div>

              <!-- Title -->
              <h3 class="text-sm font-bold text-zinc-100 leading-snug group-hover:text-emerald-400 transition-colors">
                {{ entry.title }}
              </h3>

              <!-- Problem Summary -->
              <p class="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                {{ entry.problemSummary }}
              </p>
            </div>

            <!-- Proven Root Cause Box -->
            <div class="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 text-xs space-y-1">
              <div class="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <mat-icon class="text-xs">lightbulb</mat-icon>
                <span>Causa Raiz Comprovada</span>
              </div>
              <p class="text-zinc-300 text-[11px] leading-relaxed line-clamp-2">
                {{ entry.rootCause }}
              </p>
            </div>

            <!-- Card Bottom: Reproductions & CTA -->
            <div class="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
              <button
                (click)="upvote(entry.id)"
                class="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
                title="Confirmar que esta solução funcionou para você também"
              >
                <mat-icon class="text-xs text-emerald-400">thumb_up</mat-icon>
                <span>{{ entry.reproductionsCount }} confirmações</span>
              </button>

              <button
                (click)="selectedEntry.set(entry)"
                class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm transition-all active:scale-95"
              >
                <mat-icon class="text-xs">visibility</mat-icon>
                <span>Ver Playbook</span>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Playbook Detail Modal -->
      @if (selectedEntry()) {
        <div class="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            
            <!-- Modal Header -->
            <div class="p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span
                    class="font-mono text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                    [class]="getTierBadgeClass(selectedEntry()!.confidenceTier)"
                  >
                    {{ selectedEntry()!.confidenceTier }}
                  </span>
                  <span class="text-xs text-zinc-400">• {{ selectedEntry()!.environment.framework }} ({{ selectedEntry()!.environment.version }})</span>
                </div>
                <h2 class="text-base font-bold text-zinc-100">{{ selectedEntry()!.title }}</h2>
              </div>

              <button (click)="selectedEntry.set(null)" class="text-zinc-400 hover:text-zinc-200 p-1">
                <mat-icon class="text-lg">close</mat-icon>
              </button>
            </div>

            <!-- Modal Content -->
            <div class="flex-1 overflow-y-auto p-6 space-y-5 text-xs custom-scrollbar">
              
              <!-- Symptoms -->
              <div class="space-y-1.5">
                <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Sintomas Observados</div>
                <ul class="pl-4 list-disc space-y-0.5 text-zinc-300">
                  @for (symptom of selectedEntry()!.symptoms; track $index) {
                    <li>{{ symptom }}</li>
                  }
                </ul>
              </div>

              <!-- Root Cause -->
              <div class="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                <div class="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <mat-icon class="text-xs">search</mat-icon> Causa Raiz Investigada
                </div>
                <p class="text-zinc-200 leading-relaxed">{{ selectedEntry()!.rootCause }}</p>
              </div>

              <!-- Steps to Solve -->
              <div class="space-y-2">
                <div class="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <mat-icon class="text-xs">checklist</mat-icon> Passos Reproduzíveis da Resolução
                </div>
                <ol class="pl-4 list-decimal space-y-1.5 text-zinc-300 marker:text-emerald-400 marker:font-bold">
                  @for (step of selectedEntry()!.solutionSteps; track $index) {
                    <li class="leading-relaxed">{{ step }}</li>
                  }
                </ol>
              </div>

              <!-- Code Fix -->
              @if (selectedEntry()!.codeFix) {
                <div class="space-y-1.5">
                  <div class="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                    <mat-icon class="text-xs">code</mat-icon> Código / Configuração
                  </div>
                  <pre class="bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono text-[11px] text-emerald-300 whitespace-pre-wrap overflow-x-auto">{{ selectedEntry()!.codeFix }}</pre>
                </div>
              }

              <!-- Failed Attempts Warning -->
              @if (selectedEntry()!.failedAttempts && selectedEntry()!.failedAttempts!.length > 0) {
                <div class="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl space-y-1">
                  <div class="text-[11px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1">
                    <mat-icon class="text-xs">warning</mat-icon> O Que NÃO Funcionou (Tentativas Fracassadas)
                  </div>
                  <ul class="pl-4 list-disc space-y-0.5 text-zinc-400">
                    @for (fail of selectedEntry()!.failedAttempts!; track $index) {
                      <li>{{ fail }}</li>
                    }
                  </ul>
                </div>
              }

              <!-- Meta info -->
              <div class="grid grid-cols-2 gap-2 p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-[11px]">
                <div>
                  <span class="text-zinc-500">Versões Afetadas:</span>
                  <div class="font-mono text-rose-300">{{ selectedEntry()!.affectedVersions.join(', ') }}</div>
                </div>
                <div>
                  <span class="text-zinc-500">Versões Confirmadas:</span>
                  <div class="font-mono text-emerald-300">{{ selectedEntry()!.confirmedVersions.join(', ') }}</div>
                </div>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <button
                (click)="upvote(selectedEntry()!.id)"
                class="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-emerald-300 rounded-xl text-xs font-medium flex items-center gap-1.5 border border-zinc-700"
              >
                <mat-icon class="text-xs text-emerald-400">thumb_up</mat-icon>
                <span>Confirmou para mim (+1)</span>
              </button>

              <div class="flex items-center gap-2">
                <button
                  (click)="startInvestigationFromKB(selectedEntry()!)"
                  class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm"
                >
                  <mat-icon class="text-xs">science</mat-icon>
                  <span>Iniciar Sessão com este Template</span>
                </button>
                <button
                  (click)="selectedEntry.set(null)"
                  class="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class KnowledgeBaseComponent {
  private kbService = inject(KnowledgeBaseService);
  private sessionService = inject(DebugSessionService);
  private router = inject(Router);

  searchControl = new FormControl('', { nonNullable: true });
  tierControl = new FormControl('all', { nonNullable: true });

  selectedEntry = signal<KnowledgeEntry | null>(null);

  readonly popularTags = ['expo', 'node.js', 'react-native', 'esm', 'hydration', 'cors', 'memory-leak'];

  filteredEntries = computed(() => {
    const q = this.searchControl.value;
    const tier = this.tierControl.value;
    return this.kbService.search(q, { tier: tier === 'all' ? undefined : tier });
  });

  applyTagFilter(tag: string) {
    this.searchControl.setValue(tag);
  }

  upvote(id: string) {
    this.kbService.upvoteReproduction(id);
    if (this.selectedEntry() && this.selectedEntry()!.id === id) {
      const updated = this.kbService.entries().find((e) => e.id === id);
      if (updated) this.selectedEntry.set(updated);
    }
  }

  async startInvestigationFromKB(entry: KnowledgeEntry) {
    this.selectedEntry.set(null);
    await this.sessionService.createSession({
      title: `Investigação: ${entry.title}`,
      description: entry.problemSummary,
      mode: 'debugger',
      environment: entry.environment,
      initialMessage: `Estou enfrentando sintomas parecidos com "${entry.title}". Vamos validar se a causa raiz é idêntica.`,
    });
    this.router.navigate(['/']);
  }

  getTierBadgeClass(tier: ConfidenceTier): string {
    switch (tier) {
      case 'high': return 'bg-purple-950/80 text-purple-300 border border-purple-800';
      case 'reproduced': return 'bg-emerald-950/80 text-emerald-300 border border-emerald-800';
      case 'tested': return 'bg-sky-950/80 text-sky-300 border border-sky-800';
      default: return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  }

  getTierIcon(tier: ConfidenceTier): string {
    switch (tier) {
      case 'high': return 'workspace_premium';
      case 'reproduced': return 'verified';
      case 'tested': return 'science';
      default: return 'help_outline';
    }
  }
}
