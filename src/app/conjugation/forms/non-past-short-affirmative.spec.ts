import {NonPastShortAffirmative} from "./non-past-short-affirmative";
import {Word, WordType} from "../conjugation";

describe('NonPastShortAffirmative', () => {

    it('Ichidan Verb', () => {
        const word = new Word('食べる', 'たべる', WordType.IchidanVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word);
    });

    it('Godan Verb', () => {
        const word = new Word('行く', 'いく', WordType.GodanVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word);
    });

    it('Suru Verb', () => {
        const word = new Word('勉強', 'べんきょう', WordType.SuruVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word);
    });

    it('Kuru Verb', () => {
        const word = new Word('来る', 'くる', WordType.KuruVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word);
    });

    it('I-Adjective', () => {
        const word = new Word('美味しい', 'おいしい', WordType.IAdjective)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word);
    });

    it('I-Adjective', () => {
        const word = new Word('好き', 'すき', WordType.NaAdjective)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word);
    });
})
