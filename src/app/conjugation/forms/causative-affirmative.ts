import {Conjugation, Word, WordType} from "../conjugation";
import {HIRAGANA} from "../hiragana";

export class CausativeAffirmative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
                const lastKana = HIRAGANA[word.getLastKana()]
                if (lastKana.kana === 'う') {
                    return word.replaceLastKana('わせる')
                }

                return word.replaceLastKana(lastKana.getGroup().a + 'せる')

            case WordType.IchidanVerb:
                return word.replaceLastKana('させる');

            case WordType.SuruVerb:
                return word.addSuffix('させる');

            case WordType.KuruVerb:
                return new Word('来させる', 'こさせる', word.wordType);


            default:
                return undefined;
        }
    }

}
