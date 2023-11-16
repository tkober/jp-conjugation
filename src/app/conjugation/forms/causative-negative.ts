import {Conjugation, Word, WordType} from "../conjugation";

class CausativeNegative implements Conjugation {
    getConjugation(word: Word): Word {
        switch (word.wordType) {
            case WordType.GodanVerb:
                return new Word('TODO', 'TODO', word.wordType);

            case WordType.IchidanVerb:
                return new Word('TODO', 'TODO', word.wordType);

            case WordType.SuruVerb:
                return new Word('TODO', 'TODO', word.wordType);

            case WordType.KuruVerb:
                return new Word('TODO', 'TODO', word.wordType);

            case WordType.IAdjective:
                return new Word('TODO', 'TODO', word.wordType);

            case WordType.NaAdjective:
                return new Word('TODO', 'TODO', word.wordType);
        }
    }

}
