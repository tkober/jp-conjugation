import {Conjugation, Word, WordType} from "../conjugation";
import {PassiveAffirmative} from "./passive-affirmative";
import {CausativeAffirmative} from "./causative-affirmative";

export class CausativePassiveAffirmative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {

        const originalType = word.wordType;
        const causative = new CausativeAffirmative().getConjugation(word);
        if (causative === undefined) {
            return undefined;
        }

        return new PassiveAffirmative().getConjugation(causative.changeType(WordType.GodanVerb))?.changeType(originalType)
    }

    getTitle(): string {
        return "Causative-Passive, affirmative"
    }

}
