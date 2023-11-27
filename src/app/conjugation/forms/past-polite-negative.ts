import {Conjugation, Word, WordType} from "../conjugation";
import {HIRAGANA} from "../hiragana";

export class PastPoliteNegative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
                const lastKana = HIRAGANA[word.getLastKana()]
                return word.replaceLastKana(lastKana.getGroup().i + 'ませんでした')

            case WordType.IchidanVerb:
                return word.replaceLastKana('ませんでした');

            case WordType.SuruVerb:
                return word.replaceLastKana('しませんでした', 2);

            case WordType.KuruVerb:
                return new Word('来ませんでした', 'きませんでした', word.wordType);


            // Adjectives
            case WordType.IAdjective:
                return word.replaceLastKana('くなかったです')

            case WordType.NaAdjective:
                return word.addSuffix('じゃなかったです')


            default:
                return undefined;
        }
    }

    getTitle(): string {
        return "Past, polite, negative"
    }

}
