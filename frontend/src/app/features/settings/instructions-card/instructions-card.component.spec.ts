import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Settings } from '../../../core/models';
import { InstructionsCardComponent } from './instructions-card.component';

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    groups: [],
    jlpt_levels: [],
    disabled_forms: [],
    disabled_jlpt: [],
    time_base_ms: 4500,
    time_per_kana_ms: 1000,
    instruction_style: 'text',
    instruction_order: ['polarity', 'politeness', 'category', 'tense'],
    instruction_styles: ['text', 'emoji', 'both'],
    instruction_dimensions: [
      {
        dimension: 'tense',
        label: 'Tense',
        values: [{ value: 'non_past', label: 'Non-past', emoji: '⏳' }],
      },
      {
        dimension: 'category',
        label: 'Category',
        values: [{ value: 'te_form', label: 'Te-form', emoji: null }],
      },
    ],
    instruction_examples: [[]],
    defaults: {
      time_base_ms: 4500,
      time_per_kana_ms: 1000,
      instruction_style: 'text',
      instruction_order: ['tense', 'polarity', 'politeness', 'category'],
    },
    limits: { time_base_ms: [0, 10000], time_per_kana_ms: [0, 2000] },
    examples: [],
    ...overrides,
  };
}

function render(s: Settings) {
  const fixture = TestBed.createComponent(InstructionsCardComponent);
  fixture.componentRef.setInput('settings', s);
  fixture.detectChanges();
  return fixture;
}

describe('InstructionsCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('emits save with the chosen style when a radio is picked', () => {
    const fixture = render(settings());
    const spy = vi.fn();
    fixture.componentInstance.save.subscribe(spy);

    const emojiRadio = Array.from(fixture.nativeElement.querySelectorAll('.toggle')).find(
      (el) => (el as HTMLElement).textContent?.trim() === 'Emoji',
    ) as HTMLElement;
    emojiRadio.querySelector('input')!.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith({ instruction_style: 'emoji' });
  });

  it('hides the legend in text style and shows it otherwise', () => {
    const fixture = render(settings({ instruction_style: 'text' }));
    expect(fixture.nativeElement.querySelector('.legend')).toBeFalsy();

    fixture.componentRef.setInput('settings', settings({ instruction_style: 'emoji' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.legend')).toBeTruthy();
    // only dimension values with an emoji show up
    expect(fixture.nativeElement.querySelector('.legend').textContent).toContain('Non-past');
    expect(fixture.nativeElement.querySelector('.legend').textContent).not.toContain('Te-form');
  });

  it('emits save with the swapped order when moving an item down', () => {
    const fixture = render(settings());
    const spy = vi.fn();
    fixture.componentInstance.save.subscribe(spy);

    const downButtons = fixture.nativeElement.querySelectorAll('button[aria-label="Move down"]');
    (downButtons[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith({
      instruction_order: ['politeness', 'polarity', 'category', 'tense'],
    });
  });

  it('does nothing when moving the first item up or the last item down', () => {
    const fixture = render(settings());
    const spy = vi.fn();
    fixture.componentInstance.save.subscribe(spy);

    fixture.nativeElement.querySelectorAll('button[aria-label="Move up"]')[0].click();
    fixture.nativeElement.querySelectorAll('button[aria-label="Move down"]')[3].click();
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
  });

  it('applies the "Tense first" preset and disables its own button while active', () => {
    const fixture = render(settings());
    const spy = vi.fn();
    fixture.componentInstance.save.subscribe(spy);

    const tenseFirstBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (el) => (el as HTMLElement).textContent?.trim() === 'Tense first',
    ) as HTMLButtonElement;
    tenseFirstBtn.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith({
      instruction_order: ['category', 'tense', 'politeness', 'polarity'],
    });
    expect(tenseFirstBtn.disabled).toBe(true);
  });

  it('isActiveOrder matches the current order exactly, including length', () => {
    const fixture = render(settings({ instruction_order: ['category', 'tense', 'politeness', 'polarity'] }));
    const instance = fixture.componentInstance;
    expect(instance.isActiveOrder(['category', 'tense', 'politeness', 'polarity'])).toBe(true);
    expect(instance.isActiveOrder(['tense', 'category', 'politeness', 'polarity'])).toBe(false);
    expect(instance.isActiveOrder(['category', 'tense', 'politeness'])).toBe(false);
  });
});
