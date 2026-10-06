import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CountdownRingComponent } from './countdown-ring.component';

const RADIUS = 19;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function createComponent() {
  const fixture = TestBed.createComponent(CountdownRingComponent);
  return fixture;
}

function render(elapsedMs: number, targetMs: number) {
  const fixture = createComponent();
  fixture.componentRef.setInput('elapsedMs', elapsedMs);
  fixture.componentRef.setInput('targetMs', targetMs);
  fixture.detectChanges();
  return fixture;
}

function label(fixture: ReturnType<typeof createComponent>): string {
  return (fixture.nativeElement.querySelector('text') as HTMLElement).textContent?.trim() ?? '';
}

function valueCircle(fixture: ReturnType<typeof createComponent>): SVGCircleElement {
  return fixture.nativeElement.querySelector('circle.value');
}

function offset(fixture: ReturnType<typeof createComponent>): number {
  return Number(valueCircle(fixture).getAttribute('stroke-dashoffset'));
}

describe('CountdownRingComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('shows the full target at the start, offset 0, not low', () => {
    const fixture = render(0, 5000);

    expect(label(fixture)).toBe('5');
    expect(offset(fixture)).toBeCloseTo(0, 5);
    expect(valueCircle(fixture).classList.contains('low')).toBe(false);
  });

  it('is half-drained at the midpoint', () => {
    const fixture = render(2500, 5000);

    expect(label(fixture)).toBe('3'); // ceil(2.5)
    expect(offset(fixture)).toBeCloseTo(CIRCUMFERENCE * 0.5, 3);
    expect(valueCircle(fixture).classList.contains('low')).toBe(false);
  });

  it('turns low in the last quarter', () => {
    const fixture = render(4000, 5000); // fractionLeft = 0.2

    expect(valueCircle(fixture).classList.contains('low')).toBe(true);
    expect(fixture.nativeElement.querySelector('text').classList.contains('low')).toBe(true);
    expect(offset(fixture)).toBeCloseTo(CIRCUMFERENCE * 0.8, 3);
  });

  it('counts up past zero as "+x.x"', () => {
    const fixture = render(6500, 5000); // 1500ms over

    expect(label(fixture)).toBe('+1.5');
    expect(valueCircle(fixture).classList.contains('low')).toBe(true);
    expect(offset(fixture)).toBeCloseTo(CIRCUMFERENCE, 3);
  });

  it('treats a non-positive target as "no limit" — full ring, no low state', () => {
    const fixture = render(1000, 0);

    expect(offset(fixture)).toBeCloseTo(0, 5);
    expect(valueCircle(fixture).classList.contains('low')).toBe(false);

    const negative = render(1000, -5000);
    expect(offset(negative)).toBeCloseTo(0, 5);
  });
});
