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
                    return new Word('呉れ', 'くれ', word.wordType);
                }

                return word.replaceLastKana('ろ')

            case WordType.SuruVerb:
                return word.addSuffix('しろ');

            case WordType.KuruVerb:
                return new Word('来い', 'こい', word.wordType);


            default:
                return undefined;
        }
    }

    getTitle(): string {
        return "Imperative, affirmative"
    }

}
