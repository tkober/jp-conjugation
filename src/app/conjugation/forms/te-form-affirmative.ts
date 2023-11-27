import {Conjugation, Word, WordType} from "../conjugation";
import {HIRAGANA} from "../hiragana";

export class TeFormAffirmative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
                const lastKana = HIRAGANA[word.getLastKana()]

                //　行く
                if (word.kanji === '行く') {
                    return new Word('行って', 'いって', word.wordType)
                }

                //　う、つ、る　ー＞　って
                if (['う', 'つ', 'る'].indexOf(lastKana.kana) !== -1) {
                    return word.replaceLastKana('って')
                }

                //　む、ぶ、ぬ　ー＞　んで
                if (['む', 'ぶ', 'ぬ'].indexOf(lastKana.kana) !== -1) {
                    return word.replaceLastKana('んで')
                }

                //　く　ー＞　いて
                if (lastKana.kana === 'く') {
                    return word.replaceLastKana('いて')
                }

                //　ぐ　ー＞　いで
                if (lastKana.kana === 'ぐ') {
                    return word.replaceLastKana('いで')
                }

                //　す　ー＞　して
                if (lastKana.kana === 'す') {
                    return word.replaceLastKana('して')
                }

                return undefined;

            case WordType.IchidanVerb:
                return word.replaceLastKana('て');

            case WordType.SuruVerb:
                return word.replaceLastKana('して', 2);

            case WordType.KuruVerb:
                return new Word('来て', 'きて', word.wordType);


            default:
                return undefined;
        }
    }

    getTitle(): string {
        return "Te-Form, affirmative"
    }

}
