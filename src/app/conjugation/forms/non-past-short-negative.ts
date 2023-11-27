import {Conjugation, Word, WordType} from "../conjugation";
import {HIRAGANA} from "../hiragana";

export class NonPastShortNegative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
                const lastKana = HIRAGANA[word.getLastKana()]
                if (lastKana.kana === 'う') {
                    return word.replaceLastKana('わない')
                }

                return word.replaceLastKana(lastKana.getGroup().a + 'ない')

            case WordType.IchidanVerb:
                return word.replaceLastKana('ない');

            case WordType.SuruVerb:
                return word.replaceLastKana('しない', 2);

            case WordType.KuruVerb:
                return new Word('来ない', 'こない', word.wordType);


            // Adjectives
            case WordType.IAdjective:
                return word.replaceLastKana('くない');

            case WordType.NaAdjective:
                return word.addSuffix('じゃない');


            default:
                return undefined;
        }
    }

    getTitle(): string {
        return "Non-past, short, negative"
    }

}
