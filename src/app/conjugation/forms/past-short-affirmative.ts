import {Conjugation, Word, WordType} from "../conjugation";

export class PastShortAffirmative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
                return new Word('TODO', 'TODO', word.wordType);

            case WordType.IchidanVerb:
                return new Word('TODO', 'TODO', word.wordType);

            case WordType.SuruVerb:
                return new Word('TODO', 'TODO', word.wordType);

            case WordType.KuruVerb:
                return new Word('TODO', 'TODO', word.wordType);


            // Adjectives
            case WordType.IAdjective:
                return word.replaceLastKana('かった')

            case WordType.NaAdjective:
                return word.addSuffix('だった')


            default:
                return undefined;
        }
    }

}
