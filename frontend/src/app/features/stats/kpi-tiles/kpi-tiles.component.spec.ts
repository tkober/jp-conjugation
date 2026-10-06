import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { KpiTilesComponent } from './kpi-tiles.component';

function render(
  values: { attempts?: number; accuracy?: number | null; avgTimeMs?: number | null; bestStreak?: number } = {},
) {
  const fixture = TestBed.createComponent(KpiTilesComponent);
  fixture.componentRef.setInput('attempts', values.attempts ?? 42);
  fixture.componentRef.setInput('accuracy', 'accuracy' in values ? values.accuracy : 0.75);
  fixture.componentRef.setInput('avgTimeMs', 'avgTimeMs' in values ? values.avgTimeMs : 2345);
  fixture.componentRef.setInput('bestStreak', values.bestStreak ?? 9);
  fixture.detectChanges();
  return fixture;
}

describe('KpiTilesComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders the four tiles', () => {
    const fixture = render({ attempts: 42, accuracy: 0.75, avgTimeMs: 2345, bestStreak: 9 });
    const values = Array.from(fixture.nativeElement.querySelectorAll('.tile b')).map(
      (el: unknown) => (el as HTMLElement).textContent?.trim(),
    );
    expect(values).toEqual(['42', '75%', '2.3 s', '9']);
  });

  it('shows a dash for null accuracy and null average time', () => {
    const fixture = render({ accuracy: null, avgTimeMs: null });
    const values = Array.from(fixture.nativeElement.querySelectorAll('.tile b')).map(
      (el: unknown) => (el as HTMLElement).textContent?.trim(),
    );
    expect(values[1]).toBe('—');
    expect(values[2]).toBe('—');
  });
});
