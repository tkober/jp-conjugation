import {Conjugation, Word, WordType} from "../conjugation";
import {HIRAGANA} from "../hiragana";

export class PotentialAffirmative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
                const lastKana = HIRAGANA[word.getLastKana()]

                return word.replaceLastKana(lastKana.getGroup().e + 'る')

            case WordType.IchidanVerb:
                return word.replaceLastKana('られる');

            case WordType.SuruVerb:
                return word.replaceLastKana('ができる', 2);

            case WordType.KuruVerb:
                return word.replace('来られる', 'こられる');


            default:
                return undefined;
        }
    }

    getTitle(): string {
        return "Potential, affirmative"
    }

    getSettingsTitle(): string {
        return "Affirmative"
    }

}
