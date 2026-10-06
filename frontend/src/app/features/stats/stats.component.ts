import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { ApiService } from '../../core/api.service';
import { Stats } from '../../core/models';
import { wordTypeTitle } from '../../shared/word-types';
import { EloSparklineComponent } from './elo-sparkline/elo-sparkline.component';
import { KpiTilesComponent } from './kpi-tiles/kpi-tiles.component';
import { MissRateHeatmapComponent } from './miss-rate-heatmap/miss-rate-heatmap.component';

@Component({
  selector: 'app-stats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, KpiTilesComponent, EloSparklineComponent, MissRateHeatmapComponent],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css',
})
export class StatsComponent {
  private api = inject(ApiService);

  readonly stats = signal<Stats | null>(null);

  constructor() {
    this.api.stats().subscribe((s) => this.stats.set(s));
  }

  typeTitle(type: string): string {
    return wordTypeTitle(type);
  }
}
