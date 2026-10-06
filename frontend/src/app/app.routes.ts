import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'practice' },
  {
    path: 'practice',
    loadComponent: () =>
      import('./features/practice/practice.component').then((m) => m.PracticeComponent),
    title: 'Practice · Conjugation Trainer',
  },
  {
    path: 'rules',
    loadComponent: () =>
      import('./features/rules/rules.component').then((m) => m.RulesComponent),
    title: 'Rules · Conjugation Trainer',
  },
  {
    path: 'rules/:form',
    loadComponent: () =>
      import('./features/rules/rules.component').then((m) => m.RulesComponent),
    title: 'Rules · Conjugation Trainer',
  },
  {
    path: 'stats',
    loadComponent: () =>
      import('./features/stats/stats.component').then((m) => m.StatsComponent),
    title: 'Stats · Conjugation Trainer',
  },
  {
    path: 'words',
    loadComponent: () =>
      import('./features/words/words.component').then((m) => m.WordsComponent),
    title: 'Words · Conjugation Trainer',
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then((m) => m.SettingsComponent),
    title: 'Settings · Conjugation Trainer',
  },
  { path: '**', redirectTo: 'practice' },
];
