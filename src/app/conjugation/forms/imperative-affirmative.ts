import {Conjugation, Word, WordType} from "../conjugation";
import {HIRAGANA} from "../hiragana";

export class ImperativeAffirmative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
                const lastKana = HIRAGANA[word.getLastKana()]
                return word.replaceLastKana(lastKana.getGroup().e)

            case WordType.IchidanVerb:
                // Exception: 呉れる
                if (word.kanji === '呉れる') {
                    return word.replace('呉れ', 'くれ');
                }

                return word.replaceLastKana('ろ')

            case WordType.SuruVerb:
                return word.replaceLastKana('しろ', 2);

            case WordType.KuruVerb:
                return word.replace('来い', 'こい');


            default:
                return undefined;
        }
    }

    getTitle(): string {
        return "Imperative, affirmative"
    }

    getSettingsTitle(): string {
        return "Affirmative"
    }

}
