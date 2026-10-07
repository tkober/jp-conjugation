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
    // accent/motif are placeholders until the real design is picked in
    // tkober/sumi-ui#25 — no `pattern` on purpose, nothing else design-wise
    // is hardcoded here.
    provideSumi({ accent: 'fuji', motif: 'bamboo' }),
  ],
};
