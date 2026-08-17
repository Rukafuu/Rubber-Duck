import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { SecretBannerComponent } from './components/secret-banner/secret-banner.component';
import { NewSessionModalComponent } from './components/new-session-modal/new-session-modal.component';
import { ThemeService } from './services/theme.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent,
    SecretBannerComponent,
    NewSessionModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly themeService = inject(ThemeService);
  showGlobalNewModal = signal<boolean>(false);
}

