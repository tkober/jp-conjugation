import {Conjugation, Word, WordType} from "../conjugation";
import {PotentialAffirmative} from "./potential-affirmative";
import {NonPastShortNegative} from "./non-past-short-negative";

export class PotentialNegative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {

        const originalType = word.wordType;
        const potential = new PotentialAffirmative().getConjugation(word);
        if (potential === undefined) {
            return undefined;
        }

        return new NonPastShortNegative().getConjugation(potential.changeType(WordType.IchidanVerb))?.changeType(originalType)
    }

    getTitle(): string {
        return "Potential, negative"
    }

}
