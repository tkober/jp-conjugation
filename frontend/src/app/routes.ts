import { Routes } from '@angular/router';

import { PracticeComponent } from './practice.component';
import { SettingsComponent } from './settings.component';
import { StatsComponent } from './stats.component';
import { WordsComponent } from './words.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'practice' },
  {
    path: 'practice',
    component: PracticeComponent,
    title: 'Practice · Conjugation Trainer',
  },
  { path: 'stats', component: StatsComponent, title: 'Stats · Conjugation Trainer' },
  { path: 'words', component: WordsComponent, title: 'Words · Conjugation Trainer' },
  {
    path: 'settings',
    component: SettingsComponent,
    title: 'Settings · Conjugation Trainer',
  },
  { path: '**', redirectTo: 'practice' },
];
