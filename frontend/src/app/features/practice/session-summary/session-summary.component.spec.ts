import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionSummaryComponent } from './session-summary.component';

function render(
  values: { answered?: number; correct?: number; totalTimeMs?: number; eloDelta?: number } = {},
) {
  const fixture = TestBed.createComponent(SessionSummaryComponent);
  fixture.componentRef.setInput('answered', values.answered ?? 10);
  fixture.componentRef.setInput('correct', values.correct ?? 7);
  fixture.componentRef.setInput('totalTimeMs', values.totalTimeMs ?? 35000);
  fixture.componentRef.setInput('eloDelta', values.eloDelta ?? 0);
  fixture.detectChanges();
  return fixture;
}

describe('SessionSummaryComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders answered, correct, accuracy and average time', () => {
    const fixture = render({ answered: 10, correct: 7, totalTimeMs: 35000 });
    const el: HTMLElement = fixture.nativeElement;
    const dds = el.querySelectorAll('dd');

    expect(dds[0].textContent?.trim()).toBe('10');
    expect(dds[1].textContent).toContain('7');
    expect(dds[1].textContent).toContain('70%');
    expect(dds[2].textContent?.trim()).toBe('3.5 s');
  });

  it('shows a positive Elo delta with the up class and a leading +', () => {
    const fixture = render({ eloDelta: 12.3 });
    const dd: HTMLElement = fixture.nativeElement.querySelectorAll('dd')[3];
    expect(dd.classList.contains('up')).toBe(true);
    expect(dd.classList.contains('down')).toBe(false);
    expect(dd.textContent?.trim()).toBe('+12.3');
  });

  it('shows a negative Elo delta with the down class', () => {
    const fixture = render({ eloDelta: -8 });
    const dd: HTMLElement = fixture.nativeElement.querySelectorAll('dd')[3];
    expect(dd.classList.contains('down')).toBe(true);
    expect(dd.classList.contains('up')).toBe(false);
    expect(dd.textContent?.trim()).toBe('-8');
  });

  it('is 0 accuracy / 0 average time when nothing was answered yet', () => {
    const fixture = render({ answered: 0, correct: 0, totalTimeMs: 0 });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('dd')[1].textContent).toContain('0%');
    expect(el.querySelectorAll('dd')[2].textContent?.trim()).toBe('0.0 s');
  });

  it('emits restart when the button is clicked', () => {
    const fixture = render();
    const spy = vi.fn();
    fixture.componentInstance.restart.subscribe(spy);

    fixture.nativeElement.querySelector('button.primary').click();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
