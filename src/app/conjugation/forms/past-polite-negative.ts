import {Conjugation, Word, WordType} from "../conjugation";

export class PastPoliteNegative implements Conjugation {
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
                return word.replaceLastKana('くなかったです')

            case WordType.NaAdjective:
                return word.addSuffix('じゃなかったです')


            default:
                return undefined;
        }
    }

}
