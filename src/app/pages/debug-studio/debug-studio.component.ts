import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DebugSessionService } from '../../services/debug-session.service';
import { InvestigationBoardComponent } from '../../components/investigation-board/investigation-board.component';
import { ChatFeedComponent } from '../../components/chat-feed/chat-feed.component';
import { HypothesesPanelComponent } from '../../components/hypotheses-panel/hypotheses-panel.component';
import { TestsPanelComponent } from '../../components/tests-panel/tests-panel.component';
import { SolutionPanelComponent } from '../../components/solution-panel/solution-panel.component';
import { SimilarIssuesPanelComponent } from '../../components/similar-issues-panel/similar-issues-panel.component';
import { NewSessionModalComponent } from '../../components/new-session-modal/new-session-modal.component';
import { DebugMode } from '../../models/debug.model';

type InspectorTab = 'hypotheses' | 'tests' | 'solution' | 'similar' | 'environment';

@Component({
  selector: 'app-debug-studio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    InvestigationBoardComponent,
    ChatFeedComponent,
    HypothesesPanelComponent,
    TestsPanelComponent,
    SolutionPanelComponent,
    SimilarIssuesPanelComponent,
    NewSessionModalComponent,
  ],
  template: `
    <div class="h-[calc(100vh-3.5rem)] flex flex-col md:flex-row bg-zinc-950 text-zinc-100 overflow-hidden">
      
      <!-- Left Sidebar: Sessions Drawer -->
      <aside class="w-full md:w-64 lg:w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
        
        <!-- Sidebar Header -->
        <div class="p-3 border-b border-zinc-800 flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
            <mat-icon class="text-sm text-emerald-400">history</mat-icon>
            <span>Sessões de Investigação</span>
          </div>
          <button
            (click)="showNewModal.set(true)"
            class="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Criar nova sessão"
          >
            <mat-icon class="text-sm">add</mat-icon>
          </button>
        </div>

        <!-- Sessions List -->
        <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          @for (session of sessions(); track session.id) {
            <button
              type="button"
              (click)="selectSession(session.id)"
              class="w-full text-left group p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex flex-col gap-1.5 relative focus:outline-none focus:ring-1 focus:ring-emerald-500"
              [class]="session.id === activeSessionId() ? 'bg-zinc-800 border-zinc-700 shadow-sm' : 'bg-zinc-950/40 border-transparent hover:border-zinc-800 hover:bg-zinc-900/60'"
            >
              <div class="flex items-start justify-between gap-1.5 w-full">
                <div class="font-semibold text-zinc-200 line-clamp-1 flex-1">
                  {{ session.title }}
                </div>
                <button
                  type="button"
                  (click)="deleteSession($event, session.id)"
                  class="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-rose-400 rounded transition-opacity"
                  title="Excluir sessão"
                >
                  <mat-icon class="text-xs">delete</mat-icon>
                </button>
              </div>

              <!-- Metadata row -->
              <div class="flex items-center justify-between text-[10px] w-full">
                <span
                  class="font-mono px-1.5 py-0.2 rounded font-medium"
                  [class]="getModeBadgeClass(session.mode)"
                >
                  {{ session.mode }}
                </span>
                <span
                  class="font-mono uppercase font-semibold"
                  [class]="getStatusColor(session.status)"
                >
                  {{ session.status }}
                </span>
              </div>
            </button>
          }
        </div>

        <!-- Sidebar Footer -->
        <div class="p-2.5 border-t border-zinc-800 bg-zinc-950/40 text-[11px] text-zinc-500 flex items-center justify-between">
          <span>{{ sessions().length }} investigações salvas</span>
          <span class="text-emerald-400 font-mono">100% Client-Safe</span>
        </div>
      </aside>

      <!-- Center: Main Investigation Studio -->
      <main class="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-hidden">
        @if (activeSession()) {
          <!-- Stepper & Title Header -->
          <app-investigation-board />

          <!-- Chat Feed -->
          <div class="flex-1 min-h-0">
            <app-chat-feed />
          </div>
        } @else {
          <div class="flex-1 flex items-center justify-center text-center p-8 text-zinc-500">
            <div class="space-y-3">
              <mat-icon class="text-4xl text-zinc-600">science</mat-icon>
              <h2 class="text-base font-bold text-zinc-300">Nenhuma sessão selecionada</h2>
              <p class="text-xs max-w-sm">Crie uma nova investigação ou selecione uma sessão no menu lateral.</p>
              <button
                (click)="showNewModal.set(true)"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
              >
                Criar Nova Sessão
              </button>
            </div>
          </div>
        }
      </main>

      <!-- Right Column: Inspector Panels & Tabs -->
      <aside class="w-full md:w-80 lg:w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0">
        
        <!-- Inspector Tabs Header -->
        <div class="flex items-center bg-zinc-950 border-b border-zinc-800 overflow-x-auto custom-scrollbar">
          <button
            (click)="activeTab.set('hypotheses')"
            [class]="activeTab() === 'hypotheses' ? 'border-sky-500 text-sky-300 bg-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-200'"
            class="px-3 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <mat-icon class="text-sm">radar</mat-icon>
            <span>Hipóteses</span>
            <span class="font-mono text-[10px] px-1 bg-zinc-800 rounded">{{ activeSession()?.hypotheses?.length || 0 }}</span>
          </button>

          <button
            (click)="activeTab.set('tests')"
            [class]="activeTab() === 'tests' ? 'border-emerald-500 text-emerald-300 bg-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-200'"
            class="px-3 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <mat-icon class="text-sm">terminal</mat-icon>
            <span>Testes</span>
            <span class="font-mono text-[10px] px-1 bg-zinc-800 rounded">{{ activeSession()?.tests?.length || 0 }}</span>
          </button>

          <button
            (click)="activeTab.set('solution')"
            [class]="activeTab() === 'solution' ? 'border-emerald-500 text-emerald-300 bg-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-200'"
            class="px-3 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <mat-icon class="text-sm">verified</mat-icon>
            <span>Solução</span>
          </button>

          <button
            (click)="activeTab.set('similar')"
            [class]="activeTab() === 'similar' ? 'border-amber-500 text-amber-300 bg-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-200'"
            class="px-3 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <mat-icon class="text-sm">auto_awesome</mat-icon>
            <span>Similares</span>
          </button>

          <button
            (click)="activeTab.set('environment')"
            [class]="activeTab() === 'environment' ? 'border-purple-500 text-purple-300 bg-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-200'"
            class="px-3 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <mat-icon class="text-sm">tune</mat-icon>
            <span>Ambiente</span>
          </button>
        </div>

        <!-- Active Tab Container -->
        <div class="flex-1 overflow-hidden">
          @switch (activeTab()) {
            @case ('hypotheses') {
              <app-hypotheses-panel />
            }
            @case ('tests') {
              <app-tests-panel />
            }
            @case ('solution') {
              <app-solution-panel />
            }
            @case ('similar') {
              <app-similar-issues-panel />
            }
            @case ('environment') {
              <!-- Environment & Raw Logs Inspector -->
              <div class="h-full overflow-y-auto p-4 space-y-4 text-xs custom-scrollbar">
                <div class="space-y-1">
                  <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Descrição Completa</div>
                  <p class="text-zinc-300 bg-zinc-950 p-3 rounded-lg border border-zinc-800 leading-relaxed">
                    {{ activeSession()?.description }}
                  </p>
                </div>

                <div class="space-y-1">
                  <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Logs Brutos Registrados</div>
                  <pre class="bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-300 whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">{{ activeSession()?.rawLogs || 'Nenhum log bruto anexado.' }}</pre>
                </div>

                <div class="space-y-1">
                  <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Stack Trace</div>
                  <pre class="bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono text-[11px] text-rose-300/90 whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar">{{ activeSession()?.stackTrace || 'Nenhum stack trace fornecido.' }}</pre>
                </div>
              </div>
            }
          }
        </div>
      </aside>
    </div>

    <!-- New Session Modal Dialog -->
    @if (showNewModal()) {
      <app-new-session-modal (modalClose)="showNewModal.set(false)" />
    }
  `,
})
export class DebugStudioComponent {
  private sessionService = inject(DebugSessionService);

  readonly sessions = this.sessionService.sessions;
  readonly activeSessionId = this.sessionService.activeSessionId;
  readonly activeSession = this.sessionService.activeSession;

  activeTab = signal<InspectorTab>('hypotheses');
  showNewModal = signal<boolean>(false);

  selectSession(id: string) {
    this.sessionService.selectSession(id);
  }

  deleteSession(e: Event, id: string) {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta sessão de investigação?')) {
      this.sessionService.deleteSession(id);
    }
  }

  getModeBadgeClass(mode: DebugMode): string {
    switch (mode) {
      case 'rubber-duck': return 'bg-amber-950/80 text-amber-300';
      case 'debugger': return 'bg-sky-950/80 text-sky-300';
      case 'mentor': return 'bg-purple-950/80 text-purple-300';
      case 'incident': return 'bg-rose-950/80 text-rose-300';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'solved': return 'text-emerald-400';
      case 'testing': return 'text-sky-400';
      case 'investigating': return 'text-amber-400';
      default: return 'text-zinc-500';
    }
  }
}
