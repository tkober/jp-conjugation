import {Word, WordType} from "../conjugation";
import {NonPastShortAffirmative} from "./non-past-short-affirmative";

describe('NonPastShortAffirmative', () => {

    it('Ichidan Verb', () => {
        const word = new Word('食べる', 'たべる', WordType.IchidanVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word)
    });

    it('Godan Verb [う]', () => {
        const word = new Word('会う', 'あう', WordType.GodanVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word)
    });

    it('Godan Verb [つ]', () => {
        const word = new Word('待つ', 'まつ', WordType.GodanVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word)
    });

    it('Godan Verb [る]', () => {
        const word = new Word('取る', 'とる', WordType.GodanVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word)
    });

    it('Godan Verb [む]', () => {
        const word = new Word('読む', 'よむ', WordType.GodanVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word)
    });

    it('Godan Verb [ぶ]', () => {
        const word = new Word('遊ぶ', 'あそぶ', WordType.GodanVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word)
    });

    it('Godan Verb [ぬ]', () => {
        const word = new Word('死ぬ', 'しぬ', WordType.GodanVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word)
    });

    it('Godan Verb [く]', () => {
        const word = new Word('書く', 'かく', WordType.GodanVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word)
    });

    it('Godan Verb [ぐ]', () => {
        const word = new Word('泳ぐ', 'およぐ', WordType.GodanVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word)
    });

    it('Godan Verb [す]', () => {
        const word = new Word('話す', 'はなす', WordType.GodanVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word)
    });

    it('Godan Verb [行く]', () => {
        const word = new Word('行く', 'いく', WordType.GodanVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word)
    });

    it('Suru Verb', () => {
        const word = new Word('勉強する', 'べんきょうする', WordType.SuruVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word)
    });

    it('Kuru Verb', () => {
        const word = new Word('来る', 'くる', WordType.KuruVerb)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word)
    });

    it('I-Adjective', () => {
        const word = new Word('美味しい', 'おいしい', WordType.IAdjective)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word)
    });

    it('I-Adjective [良い]', () => {
        const word = new Word('良い', 'よい', WordType.IAdjective)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('良い', 'いい', WordType.IAdjective))
    });

    it('Na-Adjective', () => {
        const word = new Word('好き', 'すき', WordType.NaAdjective)
        const result = new NonPastShortAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(word)
    });
})
