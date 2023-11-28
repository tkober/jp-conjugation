import {Conjugation, Word, WordType} from "../conjugation";
import {HIRAGANA} from "../hiragana";

export class PastPoliteAffirmative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
                const lastKana = HIRAGANA[word.getLastKana()]
                return word.replaceLastKana(lastKana.getGroup().i + 'ました')

            case WordType.IchidanVerb:
                return word.replaceLastKana('ました');

            case WordType.SuruVerb:
                return word.replaceLastKana('しました', 2);

            case WordType.KuruVerb:
                return new Word('来ました', 'きました', word.wordType);


            // Adjectives
            case WordType.IAdjective:
                return word.replaceLastKana('かったです')

            case WordType.NaAdjective:
                return word.addSuffix('でした')


            default:
                return undefined;
        }
    }

    getTitle(): string {
        return "Past, polite, affirmative"
    }

    getSettingsTitle(): string {
        return "Polite, affirmative"
    }

}
