import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Settings } from '../../../core/models';
import { FormsCardComponent } from './forms-card.component';

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    groups: [
      {
        category: 'Verbs',
        title: 'Non-past',
        forms: [
          { form_key: 'Verbs__NonPastAffirmative', title: 'Non-past, positive', settings_title: 'Affirmative' },
          { form_key: 'Verbs__NonPastNegative', title: 'Non-past, negative', settings_title: 'Negative' },
        ],
      },
    ],
    jlpt_levels: ['n5', 'n4'],
    disabled_forms: [],
    disabled_jlpt: [],
    time_base_ms: 4500,
    time_per_kana_ms: 1000,
    instruction_style: 'text',
    instruction_order: ['category', 'tense', 'politeness', 'polarity'],
    instruction_styles: ['text', 'emoji', 'both'],
    instruction_dimensions: [],
    instruction_examples: [],
    defaults: {
      time_base_ms: 4500,
      time_per_kana_ms: 1000,
      instruction_style: 'text',
      instruction_order: ['category', 'tense', 'politeness', 'polarity'],
    },
    limits: { time_base_ms: [0, 10000], time_per_kana_ms: [0, 2000] },
    examples: [],
    ...overrides,
  };
}

function render(s: Settings) {
  const fixture = TestBed.createComponent(FormsCardComponent);
  fixture.componentRef.setInput('settings', s);
  fixture.detectChanges();
  return fixture;
}

describe('FormsCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders a toggle per form, all on when nothing is disabled', () => {
    const fixture = render(settings());
    const toggles = fixture.nativeElement.querySelectorAll('.toggle');
    expect(toggles.length).toBe(2);
    expect(toggles[0].classList.contains('on')).toBe(true);
  });

  it('emits save with the toggled form added to disabled_forms', () => {
    const fixture = render(settings());
    const spy = vi.fn();
    fixture.componentInstance.save.subscribe(spy);

    fixture.nativeElement.querySelectorAll('.toggle input')[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith({ disabled_forms: ['Verbs__NonPastAffirmative'] });
    expect(fixture.nativeElement.querySelectorAll('.toggle')[0].classList.contains('on')).toBe(false);
  });

  it('does not emit when turning off the last remaining form (guard before the save)', () => {
    const fixture = render(settings({ disabled_forms: ['Verbs__NonPastAffirmative'] }));
    const spy = vi.fn();
    fixture.componentInstance.save.subscribe(spy);

    // The second (last enabled) toggle's input.
    fixture.nativeElement.querySelectorAll('.toggle input')[1].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
    // The guard returns before touching the signal, so the toggle stays on.
    expect(fixture.nativeElement.querySelectorAll('.toggle')[1].classList.contains('on')).toBe(true);
  });

  it('resets its optimistic state when the parent pushes new settings', () => {
    const fixture = render(settings());
    fixture.nativeElement.querySelectorAll('.toggle input')[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.toggle')[0].classList.contains('on')).toBe(false);

    fixture.componentRef.setInput('settings', settings({ disabled_forms: [] }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.toggle')[0].classList.contains('on')).toBe(true);
  });
});
