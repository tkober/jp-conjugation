import {Word, WordType} from "../conjugation";
import {PotentialAffirmative} from "./potential-affirmative";

describe('PotentialAffirmative', () => {

    it('Ichidan Verb', () => {
        const word = new Word('食べる', 'たべる', WordType.IchidanVerb)
        const result = new PotentialAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('食べられる', 'たべられる', WordType.IchidanVerb));
    });

    it('Godan Verb [う]', () => {
        const word = new Word('会う', 'あう', WordType.GodanVerb)
        const result = new PotentialAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('会える', 'あえる', WordType.GodanVerb))
    });

    it('Godan Verb [つ]', () => {
        const word = new Word('待つ', 'まつ', WordType.GodanVerb)
        const result = new PotentialAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('待てる', 'まてる', WordType.GodanVerb))
    });

    it('Godan Verb [る]', () => {
        const word = new Word('取る', 'とる', WordType.GodanVerb)
        const result = new PotentialAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('取れる', 'とれる', WordType.GodanVerb))
    });

    it('Godan Verb [む]', () => {
        const word = new Word('読む', 'よむ', WordType.GodanVerb)
        const result = new PotentialAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('読める', 'よめる', WordType.GodanVerb))
    });

    it('Godan Verb [ぶ]', () => {
        const word = new Word('遊ぶ', 'あそぶ', WordType.GodanVerb)
        const result = new PotentialAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('遊べる', 'あそべる', WordType.GodanVerb))
    });

    it('Godan Verb [ぬ]', () => {
        const word = new Word('死ぬ', 'しぬ', WordType.GodanVerb)
        const result = new PotentialAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('死ねる', 'しねる', WordType.GodanVerb))
    });

    it('Godan Verb [く]', () => {
        const word = new Word('書く', 'かく', WordType.GodanVerb)
        const result = new PotentialAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('書ける', 'かける', WordType.GodanVerb))
    });

    it('Godan Verb [ぐ]', () => {
        const word = new Word('泳ぐ', 'およぐ', WordType.GodanVerb)
        const result = new PotentialAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('泳げる', 'およげる', WordType.GodanVerb))
    });

    it('Godan Verb [す]', () => {
        const word = new Word('話す', 'はなす', WordType.GodanVerb)
        const result = new PotentialAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('話せる', 'はなせる', WordType.GodanVerb))
    });

    it('Godan Verb [行く]', () => {
        const word = new Word('行く', 'いく', WordType.GodanVerb)
        const result = new PotentialAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('行ける', 'いける', WordType.GodanVerb))
    });

    it('Suru Verb', () => {
        const word = new Word('勉強する', 'べんきょうする', WordType.SuruVerb)
        const result = new PotentialAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('勉強ができる', 'べんきょうができる', WordType.SuruVerb))
    });

    it('Kuru Verb', () => {
        const word = new Word('来る', 'くる', WordType.KuruVerb)
        const result = new PotentialAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('来られる', 'こられる', WordType.KuruVerb))
    });
})
