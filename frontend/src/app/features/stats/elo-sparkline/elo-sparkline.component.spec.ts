import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EloSparklineComponent } from './elo-sparkline.component';

function render(history: number[], elo = 1234, level = 3) {
  const fixture = TestBed.createComponent(EloSparklineComponent);
  fixture.componentRef.setInput('history', history);
  fixture.componentRef.setInput('elo', elo);
  fixture.componentRef.setInput('level', level);
  fixture.detectChanges();
  return fixture;
}

describe('EloSparklineComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders the current rating and level in the hint', () => {
    const fixture = render([1000, 1100, 1200], 1234, 3);
    const hint: HTMLElement = fixture.nativeElement.querySelector('.hint');
    expect(hint.textContent).toContain('3 answers');
    expect(hint.textContent).toContain('1,234');
    expect(hint.textContent).toContain('level 3');
  });

  it('draws the polyline when there is enough history', () => {
    const fixture = render([1000, 1100, 1200]);
    const polyline = fixture.nativeElement.querySelector('polyline');
    expect(polyline).not.toBeNull();
    expect(polyline.getAttribute('points')).toBeTruthy();
  });

  it('renders no polyline with fewer than two history points', () => {
    const fixture = render([1000]);
    expect(fixture.nativeElement.querySelector('polyline')).toBeNull();
    expect(fixture.nativeElement.querySelector('.spark-scale')).toBeNull();
  });
});
