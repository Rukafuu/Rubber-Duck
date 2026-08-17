import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DebugSessionService } from '../../services/debug-session.service';
import { DebugMode } from '../../models/debug.model';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <header class="h-14 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between text-zinc-100 select-none z-20">
      <!-- Brand & Left Nav -->
      <div class="flex items-center gap-6">
        <a routerLink="/" class="flex items-center gap-2.5 group">
          <img
            src="rubber-duck-icon.png"
            alt=""
            width="40"
            height="40"
            class="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
          />
          <div>
            <div class="flex items-center gap-1.5 font-bold tracking-tight text-sm text-zinc-100">
              <span>Rubber Duck</span>
              <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">Debug IA</span>
            </div>
          </div>
        </a>

        <!-- View Tabs -->
        <nav class="hidden md:flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
          <a
            routerLink="/"
            routerLinkActive="bg-zinc-800 text-zinc-100 shadow-sm"
            [routerLinkActiveOptions]="{ exact: true }"
            class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 rounded-md transition-colors"
          >
            <mat-icon class="text-sm">terminal</mat-icon>
            <span>Studio de Debug</span>
          </a>
          <a
            routerLink="/knowledge-base"
            routerLinkActive="bg-zinc-800 text-zinc-100 shadow-sm"
            class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 rounded-md transition-colors"
          >
            <mat-icon class="text-sm">library_books</mat-icon>
            <span>Base de Conhecimento</span>
          </a>
        </nav>
      </div>

      <!-- Center: Active Mode & Session Status -->
      @if (activeSession()) {
        <div class="hidden lg:flex items-center gap-3">
          <div class="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800 px-3 py-1 rounded-full text-xs">
            <span class="text-zinc-400">Modo:</span>
            <span
              class="font-mono font-medium px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1"
              [class]="getModeBadgeClass(activeSession()!.mode)"
            >
              <mat-icon class="text-xs">{{ getModeIcon(activeSession()!.mode) }}</mat-icon>
              {{ getModeLabel(activeSession()!.mode) }}
            </span>
          </div>

          <div class="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800 px-3 py-1 rounded-full text-xs">
            <span class="text-zinc-400">Status:</span>
            <span
              class="font-mono uppercase text-[10px] tracking-wider px-2 py-0.5 rounded font-semibold"
              [class]="getStatusClass(activeSession()!.status)"
            >
              {{ activeSession()!.status }}
            </span>
          </div>
        </div>
      }

      <!-- Right Actions -->
      <div class="flex items-center gap-2.5">
        <button
          type="button"
          (click)="themeService.toggle()"
          class="theme-toggle hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors"
          [attr.aria-label]="themeService.theme() === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'"
        >
          <mat-icon class="text-sm">{{ themeService.theme() === 'light' ? 'dark_mode' : 'light_mode' }}</mat-icon>
          <span>{{ themeService.theme() === 'light' ? 'Escuro' : 'Claro' }}</span>
        </button>
        <!-- Preset Scenario Quick Loader -->
        <div class="relative group hidden sm:block">
          <button
            class="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors"
            title="Carregar cenários reais de demonstração"
          >
            <mat-icon class="text-sm text-amber-400">play_circle_outline</mat-icon>
            <span>Cenários Demo</span>
            <mat-icon class="text-xs text-zinc-400">arrow_drop_down</mat-icon>
          </button>
          
          <div class="absolute right-0 mt-1 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-1.5 hidden group-hover:block z-50">
            <div class="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Cenários de Teste</div>
            <button
              (click)="loadPreset('session-expo-sdk-51')"
              class="w-full text-left px-2.5 py-2 text-xs text-zinc-200 hover:bg-zinc-800 rounded-lg flex items-center justify-between"
            >
              <div>
                <div class="font-medium text-amber-300">Expo SDK 51 Build Error</div>
                <div class="text-[11px] text-zinc-400">Incompatibilidade nativa gradle</div>
              </div>
              <span class="text-[10px] font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-400">Debugger</span>
            </button>
            <button
              (click)="loadPreset('session-node20-glob')"
              class="w-full text-left px-2.5 py-2 text-xs text-zinc-200 hover:bg-zinc-800 rounded-lg flex items-center justify-between mt-1"
            >
              <div>
                <div class="font-medium text-amber-300">Node 20 vs Glob v10</div>
                <div class="text-[11px] text-zinc-400">TypeError: glob.sync ESM</div>
              </div>
              <span class="text-[10px] font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-400">Rubber Duck</span>
            </button>
            <button
              (click)="loadPreset('session-prod-incident')"
              class="w-full text-left px-2.5 py-2 text-xs text-zinc-200 hover:bg-zinc-800 rounded-lg flex items-center justify-between mt-1"
            >
              <div>
                <div class="font-medium text-rose-300">Incidente P0 (OOMKilled)</div>
                <div class="text-[11px] text-zinc-400">Vazamento de memória / 503</div>
              </div>
              <span class="text-[10px] font-mono bg-rose-950/60 text-rose-300 px-1.5 py-0.5 rounded">Incident</span>
            </button>
          </div>
        </div>

        <!-- New Session CTA Button -->
        <button
          (click)="openNewSessionModal.emit()"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-sm active:scale-95"
        >
          <mat-icon class="text-sm">add</mat-icon>
          <span>Nova Investigação</span>
        </button>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  private sessionService = inject(DebugSessionService);
  readonly themeService = inject(ThemeService);

  readonly activeSession = this.sessionService.activeSession;
  readonly openNewSessionModal = output<void>();

  loadPreset(id: string) {
    this.sessionService.selectSession(id);
  }

  getModeLabel(mode: DebugMode): string {
    switch (mode) {
      case 'rubber-duck': return 'Rubber Duck';
      case 'debugger': return 'Debugger Metódico';
      case 'mentor': return 'Mentor Técnico';
      case 'incident': return 'Incidente Crítico';
    }
  }

  getModeIcon(mode: DebugMode): string {
    switch (mode) {
      case 'rubber-duck': return 'psychology';
      case 'debugger': return 'radar';
      case 'mentor': return 'school';
      case 'incident': return 'emergency';
    }
  }

  getModeBadgeClass(mode: DebugMode): string {
    switch (mode) {
      case 'rubber-duck': return 'bg-amber-950/60 text-amber-300 border border-amber-800/50';
      case 'debugger': return 'bg-sky-950/60 text-sky-300 border border-sky-800/50';
      case 'mentor': return 'bg-purple-950/60 text-purple-300 border border-purple-800/50';
      case 'incident': return 'bg-rose-950/60 text-rose-300 border border-rose-800/50 animate-pulse';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'investigating': return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      case 'testing': return 'bg-sky-500/10 text-sky-400 border border-sky-500/30';
      case 'solved': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      case 'unresolved': return 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
      default: return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  }
}
