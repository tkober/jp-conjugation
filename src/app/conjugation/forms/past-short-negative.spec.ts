import {Word, WordType} from "../conjugation";
import {PastShortNegative} from "./past-short-negative";

describe('PastShortNegative', () => {

    it('Ichidan Verb', () => {
        const word = new Word('食べる', 'たべる', WordType.IchidanVerb)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('食べなかった', 'たべなかった', WordType.IchidanVerb));
    });

    it('Godan Verb [う]', () => {
        const word = new Word('会う', 'あう', WordType.GodanVerb)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('会わなかった', 'あわなかった', WordType.GodanVerb))
    });

    it('Godan Verb [つ]', () => {
        const word = new Word('待つ', 'まつ', WordType.GodanVerb)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('待たなかった', 'またなかった', WordType.GodanVerb))
    });

    it('Godan Verb [る]', () => {
        const word = new Word('取る', 'とる', WordType.GodanVerb)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('取らなかった', 'とらなかった', WordType.GodanVerb))
    });

    it('Godan Verb [む]', () => {
        const word = new Word('読む', 'よむ', WordType.GodanVerb)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('読まなかった', 'よまなかった', WordType.GodanVerb))
    });

    it('Godan Verb [ぶ]', () => {
        const word = new Word('遊ぶ', 'あそぶ', WordType.GodanVerb)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('遊ばなかった', 'あそばなかった', WordType.GodanVerb))
    });

    it('Godan Verb [ぬ]', () => {
        const word = new Word('死ぬ', 'しぬ', WordType.GodanVerb)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('死ななかった', 'しななかった', WordType.GodanVerb))
    });

    it('Godan Verb [く]', () => {
        const word = new Word('書く', 'かく', WordType.GodanVerb)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('書かなかった', 'かかなかった', WordType.GodanVerb))
    });

    it('Godan Verb [ぐ]', () => {
        const word = new Word('泳ぐ', 'およぐ', WordType.GodanVerb)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('泳がなかった', 'およがなかった', WordType.GodanVerb))
    });

    it('Godan Verb [す]', () => {
        const word = new Word('話す', 'はなす', WordType.GodanVerb)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('話さなかった', 'はなさなかった', WordType.GodanVerb))
    });

    it('Godan Verb [行く]', () => {
        const word = new Word('行く', 'いく', WordType.GodanVerb)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('行かなかった', 'いかなかった', WordType.GodanVerb))
    });

    it('Suru Verb', () => {
        const word = new Word('勉強', 'べんきょう', WordType.SuruVerb)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('勉強しなかった', 'べんきょうしなかった', WordType.SuruVerb))
    });

    it('Kuru Verb', () => {
        const word = new Word('来る', 'くる', WordType.KuruVerb)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('来なかった', 'こなかった', WordType.KuruVerb))
    });

    it('I-Adjective', () => {
        const word = new Word('美味しい', 'おいしい', WordType.IAdjective)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('美味しくなかった', 'おいしくなかった', WordType.IAdjective))
    });

    it('I-Adjective [良い]', () => {
        const word = new Word('良い', 'よい', WordType.IAdjective)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('良くなかった', 'よくなかった', WordType.IAdjective))
    });

    it('Na-Adjective', () => {
        const word = new Word('好き', 'すき', WordType.NaAdjective)
        const result = new PastShortNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('好きじゃなかった', 'すきじゃなかった', WordType.NaAdjective))
    });
})
