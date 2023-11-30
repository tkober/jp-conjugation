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
                return word.replaceLastKana('させる', 2);

            case WordType.KuruVerb:
                return word.replace('来させる', 'こさせる');


            default:
                return undefined;
        }
    }

    getTitle(): string {
        return "Causative, affirmative"
    }

    getSettingsTitle(): string {
        return "Affirmative"
    }

}
