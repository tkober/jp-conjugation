import {Conjugation, Word, WordType} from "../conjugation";
import {NonPastShortNegative} from "./non-past-short-negative";
import {CausativeAffirmative} from "./causative-affirmative";

export class CausativeNegative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {

        const originalType = word.wordType;
        const causative = new CausativeAffirmative().getConjugation(word);
        if (causative === undefined) {
            return undefined;
        }

        return new NonPastShortNegative().getConjugation(causative.changeType(WordType.IchidanVerb))?.changeType(originalType)
    }

    getTitle(): string {
        return "Causative, negative"
    }

    getSettingsTitle(): string {
        return "Negative"
    }

}
