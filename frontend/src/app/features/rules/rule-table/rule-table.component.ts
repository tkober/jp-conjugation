import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { SumiCard } from 'sumi-ui/layout';

import { RuleRow } from '../../../core/models';
import { wordTypeLabel, wordTypeTitle } from '../../../shared/word-types';

export interface Section {
  wordType: string;
  rows: RuleRow[];
}

/** The rule table itself: the selected form's title and its rows, grouped
 *  one block per word type, with pattern rendering (`patternKind`, `tilde`)
 *  and the exception badge. Picker and explain card stay in `rules.component`
 *  — this only needs the form title and the sections already grouped by
 *  word type, nothing about categories or navigation. */
@Component({
  selector: 'app-rule-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Block: owns the whole `.card.table` section in normal flow.
  host: { style: 'display: block' },
  imports: [SumiCard],
  templateUrl: './rule-table.component.html',
  styleUrl: './rule-table.component.css',
})
export class RuleTableComponent {
  readonly formTitle = input.required<string>();
  readonly sections = input.required<Section[]>();

  typeTitle(type: string): string {
    return wordTypeTitle(type);
  }

  typeLabel(type: string): string {
    return wordTypeLabel(type);
  }

  patternKind(row: RuleRow): 'unchanged' | 'append' | 'drop' | 'replace' {
    if (!row.ending) {
      return row.replacement ? 'append' : 'unchanged';
    }
    return row.replacement ? 'replace' : 'drop';
  }

  /** 〜 marks "the rest of the word stays" — not for whole-word rules
   *  like 来る → 来ない (くる → こない), where nothing stays. */
  tilde(row: RuleRow): string {
    return row.ending === row.example.hiragana ? '' : '〜';
  }
}
