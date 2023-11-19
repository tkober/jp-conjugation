import {Word, WordType} from "../conjugation";
import {NonPastShortNegative} from "./non-past-short-negative";

describe('NonPastShortNegative', () => {

    it('Ichidan Verb', () => {
        const word = new Word('食べる', 'たべる', WordType.IchidanVerb)
        const result = new NonPastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('食べない', 'たべない', WordType.IchidanVerb));
    });

    it('Godan Verb', () => {
        const word = new Word('行く', 'いく', WordType.GodanVerb)
        const result = new NonPastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('行かない', 'いかない', WordType.GodanVerb));
    });

    it('Suru Verb', () => {
        const word = new Word('勉強', 'べんきょう', WordType.SuruVerb)
        const result = new NonPastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('勉強しない', 'べんきょうしない', WordType.SuruVerb));
    });

    it('Kuru Verb', () => {
        const word = new Word('来る', 'くる', WordType.KuruVerb)
        const result = new NonPastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('来ない', 'こない', WordType.KuruVerb));
    });

    it('I-Adjective', () => {
        const word = new Word('美味しい', 'おいしい', WordType.IAdjective)
        const result = new NonPastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('美味しくない', 'おいしくない', WordType.IAdjective));
    });

    it('Na-Adjective', () => {
        const word = new Word('好き', 'すき', WordType.NaAdjective)
        const result = new NonPastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('好きじゃない', 'すきじゃない', WordType.NaAdjective));
    });
})
