import {Conjugation, Word, WordType} from "../conjugation";
import {TeFormAffirmative} from "./te-form-affirmative";

export class PastShortAffirmative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {
        switch (word.wordType) {

            // Verbs
            case WordType.GodanVerb:
            case WordType.IchidanVerb:
            case WordType.SuruVerb:
            case WordType.KuruVerb:
                const teForm = new TeFormAffirmative().getConjugation(word)
                if (teForm === undefined) {
                    return undefined
                }

                if (teForm.getLastKana() === 'で') {
                    return teForm.replaceLastKana('だ')
                } else {
                    return teForm.replaceLastKana('た')
                }


            // Adjectives
            case WordType.IAdjective:
                return word.replaceLastKana('かった')

            case WordType.NaAdjective:
                return word.addSuffix('だった')


            default:
                return undefined;
        }
    }

    getTitle(): string {
        return "Past, short, affirmative"
    }

    getSettingsTitle(): string {
        return "Short, affirmative"
    }

}
