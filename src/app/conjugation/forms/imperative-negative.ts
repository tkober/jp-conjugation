import {Conjugation, Word, WordType} from "../conjugation";

export class ImperativeNegative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
                return word.addSuffix('な');

            case WordType.IchidanVerb:
                return word.addSuffix('な');

            case WordType.SuruVerb:
                return word.addSuffix('するな');

            case WordType.KuruVerb:
                return word.addSuffix('な');


            default:
                return undefined;
        }
    }

}
