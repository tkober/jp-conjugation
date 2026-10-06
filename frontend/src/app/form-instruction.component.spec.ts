import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { InstructionPart } from './models';
import { FormInstructionComponent } from './form-instruction.component';

const CATEGORY_PART: InstructionPart = {
  dimension: 'category',
  value: 'te_form',
  label: 'Te-form',
  emoji: null,
  marked: false,
};

const TENSE_PART: InstructionPart = {
  dimension: 'tense',
  value: 'non_past',
  label: 'Non-past',
  emoji: '⏳',
  marked: true,
};

const POLARITY_PART: InstructionPart = {
  dimension: 'polarity',
  value: 'affirmative',
  label: 'Affirmative',
  emoji: '✅',
  marked: false,
};

function createComponent() {
  const fixture = TestBed.createComponent(FormInstructionComponent);
  return fixture;
}

describe('FormInstructionComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('always renders the label for a part without an emoji, in every mode', async () => {
    for (const mode of ['text', 'emoji', 'both'] as const) {
      const fixture = createComponent();
      fixture.componentRef.setInput('parts', [CATEGORY_PART]);
      fixture.componentRef.setInput('mode', mode);
      fixture.detectChanges();
      await fixture.whenStable();

      const chip: HTMLElement = fixture.nativeElement.querySelector('.chip');
      expect(chip.textContent?.trim()).toBe('Te-form');
    }
  });

  it('renders only the label in text mode, for a part that does have an emoji', async () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('parts', [TENSE_PART]);
    fixture.componentRef.setInput('mode', 'text');
    fixture.detectChanges();
    await fixture.whenStable();

    const chip: HTMLElement = fixture.nativeElement.querySelector('.chip');
    expect(chip.textContent?.trim()).toBe('Non-past');
    expect(chip.classList.contains('emoji-only')).toBe(false);
  });

  it('renders only the emoji in emoji mode', async () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('parts', [TENSE_PART]);
    fixture.componentRef.setInput('mode', 'emoji');
    fixture.detectChanges();
    await fixture.whenStable();

    const chip: HTMLElement = fixture.nativeElement.querySelector('.chip');
    expect(chip.classList.contains('emoji-only')).toBe(true);
    expect(chip.textContent?.trim()).toBe('⏳');
    expect(chip.getAttribute('aria-label')).toBe('Non-past');
    expect(chip.getAttribute('role')).toBe('img');
  });

  it('renders both emoji and label in both mode', async () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('parts', [TENSE_PART]);
    fixture.componentRef.setInput('mode', 'both');
    fixture.detectChanges();
    await fixture.whenStable();

    const chip: HTMLElement = fixture.nativeElement.querySelector('.chip');
    expect(chip.classList.contains('emoji-only')).toBe(false);
    expect(chip.textContent?.trim()).toBe('⏳Non-past');
  });

  it('applies the .marked class only to marked parts', async () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('parts', [TENSE_PART, POLARITY_PART]);
    fixture.componentRef.setInput('mode', 'both');
    fixture.detectChanges();
    await fixture.whenStable();

    const chips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.chip'));
    expect(chips[0].classList.contains('marked')).toBe(true);
    expect(chips[1].classList.contains('marked')).toBe(false);
  });

  it('joins the part labels with " · " for the host aria-label', async () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('parts', [CATEGORY_PART, TENSE_PART, POLARITY_PART]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.getAttribute('aria-label')).toBe(
      'Te-form · Non-past · Affirmative',
    );
    expect(fixture.nativeElement.getAttribute('title')).toBe('Te-form · Non-past · Affirmative');
  });
});
