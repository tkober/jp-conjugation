import {Conjugation, Word, WordType} from "../conjugation";
import {PassiveAffirmative} from "./passive-affirmative";
import {NonPastShortNegative} from "./non-past-short-negative";

export class PassiveNegative implements Conjugation {

    getConjugation(word: Word): (Word | undefined) {

        const originalType = word.wordType;
        const passive = new PassiveAffirmative().getConjugation(word);
        if (passive === undefined) {
            return undefined;
        }

        return new NonPastShortNegative().getConjugation(passive.changeType(WordType.IchidanVerb))?.changeType(originalType)
    }

    getTitle(): string {
        return "Passive, negative"
    }

}
