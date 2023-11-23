import {Conjugation, Word, WordType} from "../conjugation";
import {HIRAGANA} from "../hiragana";

export class PassiveAffirmative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
                const lastKana = HIRAGANA[word.getLastKana()]
                if (lastKana.kana === 'う') {
                    return word.replaceLastKana('われる')
                }

                return word.replaceLastKana(lastKana.getGroup().a + 'れる')

            case WordType.IchidanVerb:
                return word.replaceLastKana('られる');

            case WordType.SuruVerb:
                return word.addSuffix('される');

            case WordType.KuruVerb:
                return new Word('来られる', 'こられる', word.wordType);


            default:
                return undefined;
        }
    }

    getTitle(): string {
        return "Passive, affirmative"
    }

}
