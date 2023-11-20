import {Conjugation, Word, WordType} from "../conjugation";
import {CausativeAffirmative} from "./causative-affirmative";
import {PassiveNegative} from "./passive-negative";

export class CausativePassiveNegative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {

        const originalType = word.wordType;
        const causative = new CausativeAffirmative().getConjugation(word);
        if (causative === undefined) {
            return undefined;
        }

        return new PassiveNegative().getConjugation(causative.changeType(WordType.GodanVerb))?.changeType(originalType)
    }

}
