import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DebugSessionService } from '../../services/debug-session.service';
import { DebugMode } from '../../models/debug.model';

@Component({
  selector: 'app-chat-feed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-zinc-950 text-zinc-100 relative">
      
      <!-- Chat Sub-Header: Mode Switcher & Filter -->
      <div class="px-4 py-2 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-2">
          <span class="text-zinc-400">Canal de Investigação com IA</span>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[11px] text-zinc-500">Alternar Modo:</span>
          <select
            [value]="activeSession()?.mode || 'debugger'"
            (change)="onModeChange($event)"
            class="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="rubber-duck">🦆 Rubber Duck</option>
            <option value="debugger">🔬 Debugger Metódico</option>
            <option value="mentor">🎓 Mentor Técnico</option>
            <option value="incident">🚨 Incidente Crítico</option>
          </select>
        </div>
      </div>

      <!-- Messages Scroll Area -->
      <div #scrollContainer class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        @if (activeSession()?.messages?.length === 0) {
          <div class="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500 space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <mat-icon class="text-2xl">chat</mat-icon>
            </div>
            <div class="space-y-1">
              <h3 class="text-sm font-semibold text-zinc-300">Investigação Iniciada</h3>
              <p class="text-xs max-w-md">Descreva os sintomas ou envie uma pergunta para a IA analisar de acordo com o método científico.</p>
            </div>
          </div>
        }

        @for (msg of activeSession()?.messages; track msg.id) {
          <div
            class="flex flex-col space-y-1.5 max-w-3xl"
            [class]="msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'"
          >
            <!-- Sender Pill & Mode Badge -->
            <div class="flex items-center gap-1.5 text-[11px] text-zinc-500 px-1">
              @if (msg.role === 'user') {
                <span class="font-medium text-zinc-400">Você (Desenvolvedor)</span>
                <span>•</span>
                <span>{{ formatTime(msg.timestamp) }}</span>
              } @else {
                <span class="font-bold text-amber-400 flex items-center gap-1">
                  <mat-icon class="text-xs">smart_toy</mat-icon> DuckTrace IA
                </span>
                <span class="font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                  {{ msg.mode }}
                </span>
                @if (msg.investigationType) {
                  <span class="font-mono text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
                    {{ msg.investigationType }}
                  </span>
                }
                <span>•</span>
                <span>{{ formatTime(msg.timestamp) }}</span>
              }
            </div>

            <!-- Message Bubble -->
            <div
              class="p-4 rounded-2xl text-xs leading-relaxed transition-all"
              [class]="msg.role === 'user' ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/80 rounded-tr-xs' : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-xs shadow-sm'"
            >
              <div class="whitespace-pre-wrap font-sans text-xs select-text">{{ msg.content }}</div>

              <!-- Suggested Actions Chips from AI -->
              @if (msg.suggestedActions && msg.suggestedActions.length > 0) {
                <div class="mt-3 pt-2.5 border-t border-zinc-800/80 space-y-1.5">
                  <div class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <mat-icon class="text-xs text-sky-400">checklist</mat-icon>
                    <span>Ações Diagnósticas Recomendadas:</span>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    @for (action of msg.suggestedActions; track action) {
                      <button
                        (click)="onActionClick(action)"
                        class="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-700/80 text-[11px] text-zinc-300 hover:text-zinc-100 hover:border-emerald-500/60 transition-colors flex items-center gap-1 text-left"
                      >
                        <mat-icon class="text-xs text-emerald-400">play_arrow</mat-icon>
                        <span>{{ action }}</span>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Quick Replies -->
            @if (msg.quickReplies && msg.quickReplies.length > 0 && $last && !isLoading()) {
              <div class="flex flex-wrap gap-1.5 pt-1">
                @for (qr of msg.quickReplies; track qr) {
                  <button
                    (click)="sendQuickReply(qr)"
                    class="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-300 hover:text-zinc-100 transition-colors flex items-center gap-1"
                  >
                    <span>{{ qr }}</span>
                  </button>
                }
              </div>
            }
          </div>
        }

        <!-- Loading / Thinking Indicator -->
        @if (isLoading()) {
          <div class="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl w-fit text-xs text-zinc-400 animate-pulse">
            <mat-icon class="text-amber-400 text-sm animate-spin">refresh</mat-icon>
            <span>DuckTrace IA está raciocinando sobre as hipóteses e variáveis...</span>
          </div>
        }
      </div>

      <!-- Attach Logs Drawer -->
      @if (showAttachLogs()) {
        <div class="px-4 py-3 bg-zinc-900 border-t border-zinc-800 space-y-2 animate-in slide-in-from-bottom-2 duration-150">
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-zinc-300 flex items-center gap-1">
              <mat-icon class="text-xs text-emerald-400">data_object</mat-icon> Anexar Logs de Execução / Stack Trace
            </span>
            <button (click)="showAttachLogs.set(false)" class="text-zinc-400 hover:text-zinc-200">
              <mat-icon class="text-xs">close</mat-icon>
            </button>
          </div>
          <textarea
            [(ngModel)]="attachedLogs"
            rows="3"
            placeholder="Cole os logs do terminal para alimentar a investigação..."
            class="w-full px-3 py-2 bg-zinc-950 font-mono text-xs text-zinc-200 placeholder-zinc-600 border border-zinc-700 rounded-lg focus:outline-none focus:border-emerald-500"
          ></textarea>
        </div>
      }

      <!-- Bottom Chat Input Bar -->
      <div class="p-3 bg-zinc-900 border-t border-zinc-800">
        <div class="flex items-end gap-2 bg-zinc-950 border border-zinc-700 rounded-xl p-2 focus-within:border-emerald-500 transition-colors">
          
          <!-- Attach Logs Toggle Button -->
          <button
            type="button"
            (click)="showAttachLogs.set(!showAttachLogs())"
            [class]="showAttachLogs() ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'"
            class="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Anexar logs brutos ou stack trace"
          >
            <mat-icon class="text-base">receipt_long</mat-icon>
          </button>

          <!-- Input Field -->
          <textarea
            [formControl]="inputControl"
            (keydown.enter)="onEnterKey($event)"
            rows="1"
            placeholder="Pergunte, informe o resultado de um teste ou relate um sintoma... (Enter para enviar)"
            class="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none py-1 max-h-32 custom-scrollbar"
          ></textarea>

          <!-- Send Button -->
          <button
            type="button"
            (click)="sendMessage()"
            [disabled]="!inputControl.value.trim() && !attachedLogs.trim() || isLoading()"
            class="p-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-all"
            title="Enviar mensagem"
          >
            <mat-icon class="text-base">send</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ChatFeedComponent {
  private sessionService = inject(DebugSessionService);

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  readonly activeSession = this.sessionService.activeSession;
  readonly isLoading = this.sessionService.isAiLoadingSignal;

  inputControl = new FormControl('', { nonNullable: true });
  showAttachLogs = signal<boolean>(false);
  attachedLogs = '';

  constructor() {
    effect(() => {
      // Auto-scroll on new messages or loading state
      const messages = this.activeSession()?.messages;
      const loading = this.isLoading();
      if (messages || loading) {
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
  }

  scrollToBottom() {
    if (this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  onEnterKey(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage() {
    let text = this.inputControl.value.trim();
    if (this.attachedLogs.trim()) {
      text = text ? `${text}\n\n\`\`\`log\n${this.attachedLogs.trim()}\n\`\`\`` : `\`\`\`log\n${this.attachedLogs.trim()}\n\`\`\``;
      this.attachedLogs = '';
      this.showAttachLogs.set(false);
    }

    if (!text || this.isLoading()) return;

    this.inputControl.reset();
    this.sessionService.sendUserMessage(text);
  }

  sendQuickReply(text: string) {
    this.sessionService.sendUserMessage(text);
  }

  onActionClick(action: string) {
    this.sessionService.sendUserMessage(`Executando ação recomendada: ${action}`);
  }

  onModeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      this.sessionService.switchMode(target.value as DebugMode);
    }
  }

  formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }
}
