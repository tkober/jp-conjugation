import {Conjugation, Word, WordType} from "../conjugation";
import {HIRAGANA} from "../hiragana";

export class NonPastPoliteAffirmative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
                const lastKana = HIRAGANA[word.getLastKana()]
                return word.replaceLastKana(lastKana.getGroup().i + 'ます')

            case WordType.IchidanVerb:
                return word.replaceLastKana('ます');

            case WordType.SuruVerb:
                return word.replaceLastKana('します', 2);

            case WordType.KuruVerb:
                return new Word('来ます', 'きます', word.wordType);


            // Adjectives
            case WordType.IAdjective:
                if (word.kanji === '良い') {
                    return new Word('良いです', 'いいです', word.wordType);
                }

                return word.addSuffix('です');

            case WordType.NaAdjective:
                return word.addSuffix('です');


            default:
                return undefined;
        }
    }

    getTitle(): string {
        return "Non-past, polite, affirmative"
    }

    getSettingsTitle(): string {
        return "Polite, affirmative"
    }

}
