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
                return word.addSuffix('ができる');

            case WordType.KuruVerb:
                return new Word('来られる', 'こられる', word.wordType);


            default:
                return undefined;
        }
    }

    getTitle(): string {
        return "Potential, affirmative"
    }

}
