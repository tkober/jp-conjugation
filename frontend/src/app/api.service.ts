import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import {
  AnswerRequest,
  AnswerResult,
  Exercise,
  Profile,
  Settings,
  SettingsUpdate,
  Stats,
  WordsResponse,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  /** Shared header state, refreshed by every response that carries it. */
  readonly profile = signal<Profile | null>(null);

  loadProfile(): Observable<Profile> {
    return this.http
      .get<Profile>('/api/profile')
      .pipe(tap((p) => this.profile.set(p)));
  }

  nextExercise(): Observable<Exercise> {
    return this.http.get<Exercise>('/api/exercise/next').pipe(
      tap((e) =>
        this.profile.set({
          elo: e.elo,
          level: e.level,
          level_progress: e.level_progress,
          current_streak: e.current_streak,
          best_streak: e.best_streak,
        }),
      ),
    );
  }

  answer(request: AnswerRequest): Observable<AnswerResult> {
    return this.http.post<AnswerResult>('/api/answer', request).pipe(
      tap((r) =>
        this.profile.set({
          elo: r.elo.after,
          level: r.user_level,
          level_progress: r.level_progress,
          current_streak: r.streak,
          best_streak: r.best_streak,
        }),
      ),
    );
  }

  stats(): Observable<Stats> {
    return this.http.get<Stats>('/api/stats').pipe(
      tap((s) =>
        this.profile.set({
          elo: s.elo,
          level: s.level,
          level_progress: s.level_progress,
          current_streak: s.current_streak,
          best_streak: s.best_streak,
        }),
      ),
    );
  }

  settings(): Observable<Settings> {
    return this.http.get<Settings>('/api/settings');
  }

  saveSettings(update: SettingsUpdate): Observable<Settings> {
    return this.http.put<Settings>('/api/settings', update);
  }

  words(filters: {
    word_type?: string;
    jlpt?: string;
    q?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  }): Observable<WordsResponse> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<WordsResponse>('/api/words', { params });
  }

  reset(): Observable<{ status: string }> {
    return this.http.post<{ status: string }>('/api/reset', { confirm: 'RESET' });
  }
}
