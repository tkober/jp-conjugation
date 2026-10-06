import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Settings } from '../../../core/models';
import { VocabularyCardComponent } from './vocabulary-card.component';

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    groups: [],
    jlpt_levels: ['n5', 'n4', 'n3'],
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
  const fixture = TestBed.createComponent(VocabularyCardComponent);
  fixture.componentRef.setInput('settings', s);
  fixture.detectChanges();
  return fixture;
}

describe('VocabularyCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders a toggle per JLPT level, uppercased', () => {
    const fixture = render(settings());
    const toggles = fixture.nativeElement.querySelectorAll('.toggle');
    expect(toggles.length).toBe(3);
    expect(toggles[0].textContent.trim()).toBe('N5');
  });

  it('emits save with the toggled level added to disabled_jlpt', () => {
    const fixture = render(settings());
    const spy = vi.fn();
    fixture.componentInstance.save.subscribe(spy);

    fixture.nativeElement.querySelectorAll('.toggle input')[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith({ disabled_jlpt: ['n5'] });
  });

  it('does not emit when turning off the last remaining level (guard before the save)', () => {
    const fixture = render(settings({ jlpt_levels: ['n5'] }));
    const spy = vi.fn();
    fixture.componentInstance.save.subscribe(spy);

    fixture.nativeElement.querySelectorAll('.toggle input')[0].dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
    // The guard returns before touching the signal, so the toggle stays on.
    expect(fixture.nativeElement.querySelectorAll('.toggle')[0].classList.contains('on')).toBe(true);
  });
});
