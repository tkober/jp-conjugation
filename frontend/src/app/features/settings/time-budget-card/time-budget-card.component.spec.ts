import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Settings } from '../../../core/models';
import { TimeBudgetCardComponent } from './time-budget-card.component';

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    groups: [],
    jlpt_levels: [],
    disabled_forms: [],
    disabled_jlpt: [],
    time_base_ms: 4500,
    time_per_kana_ms: 1000,
    instruction_style: 'text',
    instruction_order: ['category', 'tense', 'politeness', 'polarity'],
    instruction_styles: ['text', 'emoji', 'both'],
    instruction_dimensions: [],
    instruction_examples: [],
    defaults: { time_base_ms: 4500, time_per_kana_ms: 1000, instruction_style: 'text', instruction_order: ['category', 'tense', 'politeness', 'polarity'] },
    limits: { time_base_ms: [0, 10000], time_per_kana_ms: [0, 2000] },
    examples: [{ kana: 3, budget_ms: 7500 }],
    ...overrides,
  };
}

function render(s: Settings, saveTick = 0) {
  const fixture = TestBed.createComponent(TimeBudgetCardComponent);
  fixture.componentRef.setInput('settings', s);
  fixture.componentRef.setInput('saveTick', saveTick);
  fixture.detectChanges();
  return fixture;
}

describe('TimeBudgetCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('disables Save until a slider moves, then emits the draft values', () => {
    const fixture = render(settings());
    const saveBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button.primary');
    expect(saveBtn.disabled).toBe(true);

    fixture.componentInstance.baseMs.set(5000);
    fixture.detectChanges();
    expect(saveBtn.disabled).toBe(false);

    const spy = vi.fn();
    fixture.componentInstance.save.subscribe(spy);
    saveBtn.click();
    expect(spy).toHaveBeenCalledWith({ time_base_ms: 5000, time_per_kana_ms: 1000 });
  });

  it('previews using the same formula as the backend', () => {
    const fixture = render(settings());
    expect(fixture.componentInstance.preview(3)).toBe(4500 + 1000 * 3);
  });

  it('resetBudget goes back to the defaults from settings', () => {
    const fixture = render(settings());
    fixture.componentInstance.baseMs.set(9999);
    fixture.componentInstance.resetBudget();
    expect(fixture.componentInstance.baseMs()).toBe(4500);
    expect(fixture.componentInstance.perKanaMs()).toBe(1000);
  });

  it('flashes "Saved" for 1500ms when saveTick changes, not on the initial render', () => {
    const fixture = render(settings(), 0);
    const saveBtn = fixture.nativeElement.querySelector('button.primary');
    expect(saveBtn.textContent.trim()).toBe('Save');

    fixture.componentRef.setInput('saveTick', 1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button.primary').textContent.trim()).toBe('Saved');

    vi.advanceTimersByTime(1500);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button.primary').textContent.trim()).toBe('Save');
  });
});
