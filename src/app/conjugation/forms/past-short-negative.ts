import {Conjugation, Word, WordType} from "../conjugation";
import {NonPastShortNegative} from "./non-past-short-negative";

export class PastShortNegative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
            case WordType.IchidanVerb:
            case WordType.SuruVerb:
            case WordType.KuruVerb:
                return new NonPastShortNegative().getConjugation(word)?.replaceLastKana('かった')


            // Adjectives
            case WordType.IAdjective:
                return word.replaceLastKana('くなかった')

            case WordType.NaAdjective:
                return word.addSuffix('じゃなかった')


            default:
                return undefined;
        }
    }

    getTitle(): string {
        return "Past, short, negative"
    }

}
