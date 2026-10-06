import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ItemStat } from '../../../core/models';
import { MissRateHeatmapComponent } from './miss-rate-heatmap.component';

function item(overrides: Partial<ItemStat> = {}): ItemStat {
  return {
    id: 1,
    form_key: 'Verbs__TeFormAffirmative',
    title: 'Te-form, positive',
    word_type: 'godan_verb',
    trigger: '-',
    rating: 1000,
    attempts: 0,
    correct: 0,
    accuracy: null,
    last_served_at: null,
    ...overrides,
  };
}

function render(items: ItemStat[]) {
  const fixture = TestBed.createComponent(MissRateHeatmapComponent);
  fixture.componentRef.setInput('items', items);
  fixture.detectChanges();
  return fixture;
}

describe('MissRateHeatmapComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders a row per form key with one practised and one never-practised cell', () => {
    const fixture = render([
      item({ form_key: 'Verbs__TeFormAffirmative', title: 'Te-form, positive', word_type: 'ichidan_verb', attempts: 8, correct: 6 }),
    ]);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h3')?.textContent).toBe('Verbs');
    const rowLabel = el.querySelector('th.row-label');
    expect(rowLabel?.textContent?.trim()).toBe('Te-form, positive');
  });

  it('shows the readout prompt before anything is selected', () => {
    const fixture = render([]);
    expect(fixture.nativeElement.querySelector('.readout').textContent).toContain(
      'Pick a cell to see its numbers.',
    );
  });

  it('updates the readout on hover (mouseenter) of a practised cell', () => {
    const fixture = render([
      item({ form_key: 'Verbs__TeFormAffirmative', title: 'Te-form, positive', word_type: 'ichidan_verb', attempts: 8, correct: 6 }),
    ]);
    const cellButton: HTMLButtonElement = fixture.nativeElement.querySelector('.heat-table button');
    cellButton.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();

    const readout: HTMLElement = fixture.nativeElement.querySelector('.readout');
    expect(readout.textContent).toContain('6/8 correct');
    expect(readout.textContent).toContain('75%');
  });

  it('updates the readout on click, showing "not practised yet" for a never-practised cell', () => {
    const fixture = render([
      item({ form_key: 'Verbs__TeFormAffirmative', title: 'Te-form, positive', word_type: 'ichidan_verb', attempts: 0, correct: 0 }),
    ]);
    const cellButton: HTMLButtonElement = fixture.nativeElement.querySelector('.heat-table button');
    expect(cellButton.className).toContain('heat-none');

    cellButton.click();
    fixture.detectChanges();

    const readout: HTMLElement = fixture.nativeElement.querySelector('.readout');
    expect(readout.textContent).toContain('not practised yet');
  });

  it('updates the readout when a godan ending chip is clicked', () => {
    const fixture = render([
      item({ form_key: 'Verbs__TeFormAffirmative', word_type: 'godan_verb', trigger: 'ぶ', attempts: 4, correct: 1 }),
    ]);
    const chip: HTMLButtonElement = fixture.nativeElement.querySelector('.chip-cell');
    expect(chip.textContent).toContain('ぶ');

    chip.click();
    fixture.detectChanges();

    const readout: HTMLElement = fixture.nativeElement.querySelector('.readout');
    expect(readout.textContent).toContain('1/4 correct');
  });
});
