import {Conjugation, Word} from "../conjugation";
import {NonPastShortNegative} from "./non-past-short-negative";

export class TeFormNegative implements Conjugation {
    getConjugation(word: Word): (Word | undefined) {

        return new NonPastShortNegative().getConjugation(word)?.replaceLastKana('くて')
    }

    getTitle(): string {
        return "Te-Form, negative"
    }

    getSettingsTitle(): string {
        return "Negative"
    }

}
