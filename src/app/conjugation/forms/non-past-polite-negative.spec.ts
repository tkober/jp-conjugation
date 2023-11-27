import {Word, WordType} from "../conjugation";
import {NonPastPoliteNegative} from "./non-past-polite-negative";

describe('NonPastPoliteNegative', () => {

    it('Ichidan Verb', () => {
        const word = new Word('食べる', 'たべる', WordType.IchidanVerb)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('食べません', 'たべません', WordType.IchidanVerb));
    });

    it('Godan Verb [う]', () => {
        const word = new Word('会う', 'あう', WordType.GodanVerb)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('会いません', 'あいません', WordType.GodanVerb))
    });

    it('Godan Verb [つ]', () => {
        const word = new Word('待つ', 'まつ', WordType.GodanVerb)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('待ちません', 'まちません', WordType.GodanVerb))
    });

    it('Godan Verb [る]', () => {
        const word = new Word('取る', 'とる', WordType.GodanVerb)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('取りません', 'とりません', WordType.GodanVerb))
    });

    it('Godan Verb [む]', () => {
        const word = new Word('読む', 'よむ', WordType.GodanVerb)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('読みません', 'よみません', WordType.GodanVerb))
    });

    it('Godan Verb [ぶ]', () => {
        const word = new Word('遊ぶ', 'あそぶ', WordType.GodanVerb)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('遊びません', 'あそびません', WordType.GodanVerb))
    });

    it('Godan Verb [ぬ]', () => {
        const word = new Word('死ぬ', 'しぬ', WordType.GodanVerb)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('死にません', 'しにません', WordType.GodanVerb))
    });

    it('Godan Verb [く]', () => {
        const word = new Word('書く', 'かく', WordType.GodanVerb)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('書きません', 'かきません', WordType.GodanVerb))
    });

    it('Godan Verb [ぐ]', () => {
        const word = new Word('泳ぐ', 'およぐ', WordType.GodanVerb)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('泳ぎません', 'およぎません', WordType.GodanVerb))
    });

    it('Godan Verb [す]', () => {
        const word = new Word('話す', 'はなす', WordType.GodanVerb)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('話しません', 'はなしません', WordType.GodanVerb))
    });

    it('Godan Verb [行く]', () => {
        const word = new Word('行く', 'いく', WordType.GodanVerb)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('行きません', 'いきません', WordType.GodanVerb))
    });

    it('Suru Verb', () => {
        const word = new Word('勉強する', 'べんきょうする', WordType.SuruVerb)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('勉強しません', 'べんきょうしません', WordType.SuruVerb))
    });

    it('Kuru Verb', () => {
        const word = new Word('来る', 'くる', WordType.KuruVerb)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('来ません', 'きません', WordType.KuruVerb))
    });

    it('I-Adjective', () => {
        const word = new Word('美味しい', 'おいしい', WordType.IAdjective)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('美味しくないです', 'おいしくないです', WordType.IAdjective))
    });

    it('I-Adjective [良い]', () => {
        const word = new Word('良い', 'よい', WordType.IAdjective)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('良くないです', 'よくないです', WordType.IAdjective))
    });

    it('Na-Adjective', () => {
        const word = new Word('好き', 'すき', WordType.NaAdjective)
        const result = new NonPastPoliteNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('好きじゃないです', 'すきじゃないです', WordType.NaAdjective))
    });
})
