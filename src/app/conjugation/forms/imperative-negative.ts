import {Conjugation, Word, WordType} from "../conjugation";

export class ImperativeNegative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
            case WordType.IchidanVerb:
            case WordType.SuruVerb:
            case WordType.KuruVerb:
                return word.addSuffix('な');


            default:
                return undefined;
        }
    }

    getTitle(): string {
        return "Imperative, negative"
    }

}
