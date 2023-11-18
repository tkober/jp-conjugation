import {Conjugation, Word, WordType} from "../conjugation";

class NonPastShortAffirmative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
                return word;

            case WordType.IchidanVerb:
                return word;

            case WordType.SuruVerb:
                return word;

            case WordType.KuruVerb:
                return word;


            // Adjectives
            case WordType.IAdjective:
                if (word.kanji === '良い') {
                    return new Word(word.kanji, 'いい', word.wordType);
                }
                return word;

            case WordType.NaAdjective:
                return word;
        }
    }

}
