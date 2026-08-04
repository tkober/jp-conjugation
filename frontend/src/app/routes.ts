import { Routes } from '@angular/router';

import { PracticeComponent } from './practice.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'practice' },
  {
    path: 'practice',
    component: PracticeComponent,
    title: 'Practice · Conjugation Trainer',
  },
  { path: '**', redirectTo: 'practice' },
];
