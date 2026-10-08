import { provideZonelessChangeDetection } from '@angular/core';
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
    trigger: 'う',
    rating: 1000,
    attempts: 0,
    correct: 0,
    accuracy: null,
    last_served_at: null,
    ...overrides,
  };
}

function render(items: ItemStat[]) {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(MissRateHeatmapComponent);
  fixture.componentRef.setInput('items', items);
  fixture.detectChanges();
  return fixture;
}

describe('MissRateHeatmapComponent', () => {
  it('renders one matrix per block plus the godan matrix, in Japanese trigger order', () => {
    const items = [
      item({
        form_key: 'Verbs__TeFormAffirmative',
        title: 'Te-form, positive',
        word_type: 'godan_verb',
        trigger: 'う',
        attempts: 10,
        correct: 7,
        accuracy: 0.7,
      }),
      item({
        form_key: 'Verbs__TeFormAffirmative',
        title: 'Te-form, positive',
        word_type: 'godan_verb',
        trigger: 'ぶ',
        attempts: 4,
        correct: 4,
        accuracy: 1,
      }),
    ];
    const fixture = render(items);

    const headings: Element[] = Array.from(fixture.nativeElement.querySelectorAll('h3'));
    expect(headings.map((h) => h.textContent)).toEqual(['Verbs', 'Godan endings']);

    const matrices: Element[] = Array.from(
      fixture.nativeElement.querySelectorAll('sumi-matrix-heatmap'),
    );
    expect(matrices.length).toBe(2);

    // Godan matrix: single "Godan" row, triggers sorted ja-locale.
    const godanMatrix = matrices[1];
    const rowHeader = godanMatrix.querySelector('.sumi-matrix-heatmap__row-header');
    expect(rowHeader?.textContent?.trim()).toBe('Godan');
    const columnHeaders: Element[] = Array.from(
      godanMatrix.querySelectorAll('.sumi-matrix-heatmap__col-header'),
    );
    expect(columnHeaders.map((el) => el.textContent?.trim())).toEqual(['う', 'ぶ']);
  });

  it('carries the miss rate and a correct-count detail in a practised cell, and "not practised yet" in an empty one', () => {
    const items = [
      item({
        form_key: 'Verbs__TeFormAffirmative',
        title: 'Te-form, positive',
        word_type: 'ichidan_verb',
        trigger: '-',
        attempts: 10,
        correct: 7,
        accuracy: 0.7,
      }),
    ];
    const fixture = render(items);

    const cells: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.sumi-matrix-heatmap__cell--selectable'),
    );
    // Ichidan (30% miss rate, 7/10 correct) and Godan/Suru/Kuru (never practised).
    const practised = cells.find((c) => c.title.includes('30%'));
    expect(practised).toBeTruthy();
    expect(practised!.title).toContain('7/10 correct');

    const unpractised = cells.find((c) => c.title.includes('no data'));
    expect(unpractised).toBeTruthy();
    expect(unpractised!.title).toContain('not practised yet');
  });

  it('updates the shared readout when a cell is selected, naming the cell unambiguously', () => {
    const items = [
      item({
        form_key: 'Verbs__TeFormAffirmative',
        title: 'Te-form, positive',
        word_type: 'ichidan_verb',
        trigger: '-',
        attempts: 10,
        correct: 7,
        accuracy: 0.7,
      }),
    ];
    const fixture = render(items);

    expect(fixture.nativeElement.querySelector('.readout').textContent.trim()).toBe(
      'Pick a cell to see its numbers.',
    );

    const cells: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.sumi-matrix-heatmap__cell--selectable'),
    );
    const practised = cells.find((c) => c.title.includes('30%'))!;
    practised.click();
    fixture.detectChanges();

    const readout = fixture.nativeElement.querySelector('.readout').textContent as string;
    expect(readout).toContain('Te-form, positive · Ichidan verb');
    expect(readout).toContain('7/10 correct');
    expect(readout).toContain('70%');
  });

  it('shows "not practised yet" without a percentage when an empty cell is selected', () => {
    const items = [
      item({
        form_key: 'Verbs__TeFormAffirmative',
        title: 'Te-form, positive',
        word_type: 'ichidan_verb',
        trigger: '-',
        attempts: 10,
        correct: 7,
        accuracy: 0.7,
      }),
    ];
    const fixture = render(items);

    const cells: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.sumi-matrix-heatmap__cell--selectable'),
    );
    const unpractised = cells.find((c) => c.title.includes('no data'))!;
    unpractised.click();
    fixture.detectChanges();

    const readout = fixture.nativeElement.querySelector('.readout').textContent as string;
    expect(readout).toContain('not practised yet');
    expect(readout).not.toContain('%');
  });

  it('renders nothing when there are no items', () => {
    const fixture = render([]);
    expect(fixture.nativeElement.querySelectorAll('sumi-matrix-heatmap').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.readout').textContent.trim()).toBe(
      'Pick a cell to see its numbers.',
    );
  });
});
