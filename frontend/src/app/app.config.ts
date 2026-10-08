import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideSumi } from 'sumi-ui/core';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    // landscape/pattern are still placeholders until the real design is
    // picked in tkober/sumi-ui#25 — no `pattern` on purpose. `accent: 'beni'`
    // and `companion: 'tanuki'` are the user's own decisions (#41), not
    // placeholders.
    provideSumi({ accent: 'beni', motif: 'bamboo', companion: 'tanuki' }),
  ],
};
