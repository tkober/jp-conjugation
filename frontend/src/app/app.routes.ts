import { Routes } from '@angular/router';

import { PracticeComponent } from './features/practice/practice.component';
import { RulesComponent } from './features/rules/rules.component';
import { SettingsComponent } from './features/settings/settings.component';
import { StatsComponent } from './features/stats/stats.component';
import { WordsComponent } from './features/words/words.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'practice' },
  {
    path: 'practice',
    component: PracticeComponent,
    title: 'Practice · Conjugation Trainer',
  },
  { path: 'rules', component: RulesComponent, title: 'Rules · Conjugation Trainer' },
  { path: 'rules/:form', component: RulesComponent, title: 'Rules · Conjugation Trainer' },
  { path: 'stats', component: StatsComponent, title: 'Stats · Conjugation Trainer' },
  { path: 'words', component: WordsComponent, title: 'Words · Conjugation Trainer' },
  {
    path: 'settings',
    component: SettingsComponent,
    title: 'Settings · Conjugation Trainer',
  },
  { path: '**', redirectTo: 'practice' },
];
