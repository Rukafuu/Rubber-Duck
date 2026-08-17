import { Routes } from '@angular/router';
import { DebugStudioComponent } from './pages/debug-studio/debug-studio.component';
import { KnowledgeBaseComponent } from './pages/knowledge-base/knowledge-base.component';

export const routes: Routes = [
  {
    path: '',
    component: DebugStudioComponent,
    title: 'DuckTrace - Collaborative AI Debugger',
  },
  {
    path: 'knowledge-base',
    component: KnowledgeBaseComponent,
    title: 'Base de Conhecimento Coletiva - DuckTrace',
  },
  {
    path: '**',
    redirectTo: '',
  },
];

