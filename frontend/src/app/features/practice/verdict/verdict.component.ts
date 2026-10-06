import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { ruby } from '../../../shared/furigana';
import { AnswerResult, Exercise } from '../../../core/models';
import { wordTypeTitle } from '../../../shared/word-types';

/** The result card after Check: headline, grammar line, solution (on a
 *  miss), Elo delta, the Jisho link and the derivation chain. */
@Component({
  selector: 'app-verdict',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Block, not the default inline a custom element gets: `.verdict` carries
  // `margin-top`, which only acts on a block box in normal flow.
  host: { style: 'display: block' },
  imports: [DecimalPipe],
  templateUrl: './verdict.component.html',
  styleUrl: './verdict.component.css',
})
export class VerdictComponent {
  readonly result = input.required<AnswerResult>();
  readonly exercise = input.required<Exercise>();

  readonly solution = computed(() => {
    const r = this.result();
    return ruby(r.expected_kanji, r.expected_hiragana);
  });

  /** "I-adjective · Present, casual, negative" — which grammar was actually
   *  asked, shown under the verdict for both a hit and a miss (#6). For a
   *  godan verb the trigger is appended: the SRS item is form × word type ×
   *  trigger, and the ending is exactly what the rule hinges on. */
  readonly grammarLine = computed(() => {
    const ex = this.exercise();
    const type =
      ex.word_type === 'godan_verb' && ex.trigger !== '-'
        ? `${wordTypeTitle(ex.word_type)} (${ex.trigger})`
        : wordTypeTitle(ex.word_type);
    return `${type} · ${ex.form_title}`;
  });

  /** Link to the word's jisho.org entry (#7). Kanji + reading, not kanji
   *  alone: tested against jisho's search, that combination puts the exact
   *  dictionary entry first even for homographs (上手 うわて → 上手-1, 下手
   *  へた → 下手-2) and suru verbs (勉強する べんきょうする → 勉強). */
  readonly jishoUrl = computed(() => {
    const ex = this.exercise();
    return `https://jisho.org/search/${encodeURIComponent(`${ex.kanji} ${ex.hiragana}`)}`;
  });

  /** Which half of a wrong answer was right — the useful part of a miss. */
  readonly partial = computed(() => {
    const r = this.result();
    if (r.correct) {
      return '';
    }
    if (r.ending_correct && !r.stem_correct) {
      return 'Right conjugation — the word itself was misread.';
    }
    if (r.stem_correct && !r.ending_correct) {
      return 'Word read correctly — the form was wrong.';
    }
    return '';
  });

  /** Keep the on-screen keyboard open (see `PracticeComponent.keepFocus`):
   *  the Jisho link must not steal focus from the answer field either. */
  keepFocus(event: Event): void {
    event.preventDefault();
  }
}
