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
                return word.addSuffix('します');

            case WordType.KuruVerb:
                return new Word('来ます', 'きます', word.wordType);


            // Adjectives
            case WordType.IAdjective:
                return word.addSuffix('です');

            case WordType.NaAdjective:
                return word.addSuffix('です');


            default:
                return undefined;
        }
    }

}
