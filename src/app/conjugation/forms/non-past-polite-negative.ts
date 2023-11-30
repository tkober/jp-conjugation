import {Conjugation, Word, WordType} from "../conjugation";
import {HIRAGANA} from "../hiragana";

export class NonPastPoliteNegative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
                const lastKana = HIRAGANA[word.getLastKana()]
                return word.replaceLastKana(lastKana.getGroup().i + 'ません')

            case WordType.IchidanVerb:
                return word.replaceLastKana('ません');

            case WordType.SuruVerb:
                return word.replaceLastKana('しません', 2);

            case WordType.KuruVerb:
                return word.replace('来ません', 'きません');



            // Adjectives
            case WordType.IAdjective:
                return word.replaceLastKana('くないです');

            case WordType.NaAdjective:
                return word.addSuffix('じゃないです');


            default:
                return undefined;
        }
    }

    getTitle(): string {
        return "Non-past, polite, negative"
    }

    getSettingsTitle(): string {
        return "Polite, negative"
    }

}
