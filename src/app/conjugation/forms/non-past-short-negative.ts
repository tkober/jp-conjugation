import {Conjugation, Word, WordType} from "../conjugation";
import {HIRAGANA} from "../hiragana";

export class NonPastShortNegative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
                const lastKana = HIRAGANA[word.getLastKana()]
                return word.replaceLastKana(lastKana.getGroup().a + 'ない')

            case WordType.IchidanVerb:
                return word.replaceLastKana('ない');

            case WordType.SuruVerb:
                return word.addSuffix('しない');

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

}
