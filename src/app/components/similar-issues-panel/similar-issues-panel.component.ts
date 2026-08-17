import { ChangeDetectionStrategy, Component, inject, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { KnowledgeBaseService } from '../../services/knowledge-base.service';
import { DebugSessionService } from '../../services/debug-session.service';
import { KnowledgeEntry } from '../../models/debug.model';

@Component({
  selector: 'app-similar-issues-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-zinc-900 border-l border-zinc-800 text-zinc-100">
      <!-- Header -->
      <div class="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
        <div class="flex items-center gap-2">
          <mat-icon class="text-amber-400 text-base">auto_awesome</mat-icon>
          <span class="text-xs font-bold uppercase tracking-wider text-zinc-200">Casos Similares Resolvidos</span>
          <span class="px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono">
            {{ similarMatches().length }}
          </span>
        </div>
      </div>

      <!-- List of Matches -->
      <div class="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
        @if (similarMatches().length === 0) {
          <div class="p-6 text-center text-zinc-500 space-y-2">
            <mat-icon class="text-3xl text-zinc-600">search_off</mat-icon>
            <div class="text-xs font-medium">Nenhum caso similar idêntico encontrado.</div>
            <div class="text-[11px] text-zinc-500">
              Esta sessão é uma nova oportunidade para alimentar a base coletiva quando solucionada.
            </div>
          </div>
        }

        @for (item of similarMatches(); track item.entry.id) {
          <div class="p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all text-xs space-y-2">
            <!-- Score and Title -->
            <div class="flex items-start justify-between gap-2">
              <div class="font-semibold text-zinc-100 flex-1 leading-snug">
                {{ item.entry.title }}
              </div>
              <span class="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                {{ item.score }}% match
              </span>
            </div>

            <!-- Root Cause -->
            <p class="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
              {{ item.entry.rootCause }}
            </p>

            <!-- Quick Fix Preview Button -->
            <div class="pt-1 flex items-center justify-between">
              <span class="text-[10px] text-zinc-500 font-mono">
                {{ item.entry.reproductionsCount }} confirmações
              </span>
              <button
                (click)="selectedEntry.set(item.entry)"
                class="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[11px] font-medium flex items-center gap-1 border border-zinc-700 transition-colors"
              >
                <mat-icon class="text-xs">visibility</mat-icon>
                <span>Ver Solução</span>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Detail Modal when clicking "Ver Solução" -->
      @if (selectedEntry()) {
        <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <!-- Header -->
            <div class="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div class="flex items-center gap-2">
                <mat-icon class="text-emerald-400 text-base">verified</mat-icon>
                <h3 class="text-sm font-bold truncate">{{ selectedEntry()!.title }}</h3>
              </div>
              <button (click)="selectedEntry.set(null)" class="text-zinc-400 hover:text-zinc-200">
                <mat-icon class="text-base">close</mat-icon>
              </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto p-5 space-y-4 text-xs custom-scrollbar">
              <div class="space-y-1">
                <div class="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Causa Raiz</div>
                <p class="text-zinc-300">{{ selectedEntry()!.rootCause }}</p>
              </div>

              <div class="space-y-1">
                <div class="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Passos da Solução</div>
                <ol class="space-y-1 pl-4 list-decimal text-zinc-300">
                  @for (step of selectedEntry()!.solutionSteps; track $index) {
                    <li>{{ step }}</li>
                  }
                </ol>
              </div>

              @if (selectedEntry()!.codeFix) {
                <div class="space-y-1">
                  <div class="text-[11px] font-bold text-sky-400 uppercase tracking-wider">Código de Correção</div>
                  <pre class="bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono text-[11px] text-emerald-300 whitespace-pre-wrap">{{ selectedEntry()!.codeFix }}</pre>
                </div>
              }
            </div>

            <!-- Footer -->
            <div class="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <span class="text-[11px] text-zinc-400">Publicado por {{ selectedEntry()!.contributor }}</span>
              <button
                (click)="selectedEntry.set(null)"
                class="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class SimilarIssuesPanelComponent {
  private kbService = inject(KnowledgeBaseService);
  private sessionService = inject(DebugSessionService);

  readonly activeSession = this.sessionService.activeSession;
  selectedEntry = signal<KnowledgeEntry | null>(null);

  similarMatches = computed(() => {
    const session = this.activeSession();
    if (!session) return [];
    return this.kbService.findSimilar(session.title + ' ' + session.description, session.environment);
  });
}
