import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(globalThis.localStorage?.getItem('rubber-duck-theme') === 'dark' ? 'dark' : 'light');

  toggle(): void {
    const next: Theme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    globalThis.localStorage?.setItem('rubber-duck-theme', next);
  }
}
