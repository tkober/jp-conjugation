import {Word, WordType} from "../conjugation";
import {CausativeAffirmative} from "./causative-affirmative";

describe('CausativeAffirmative', () => {

    it('Ichidan Verb', () => {
        const word = new Word('食べる', 'たべる', WordType.IchidanVerb)
        const result = new CausativeAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('食べさせる', 'たべさせる', WordType.IchidanVerb));
    });

    it('Godan Verb [う]', () => {
        const word = new Word('会う', 'あう', WordType.GodanVerb)
        const result = new CausativeAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('会わせる', 'あわせる', WordType.GodanVerb))
    });

    it('Godan Verb [つ]', () => {
        const word = new Word('待つ', 'まつ', WordType.GodanVerb)
        const result = new CausativeAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('待たせる', 'またせる', WordType.GodanVerb))
    });

    it('Godan Verb [る]', () => {
        const word = new Word('取る', 'とる', WordType.GodanVerb)
        const result = new CausativeAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('取らせる', 'とらせる', WordType.GodanVerb))
    });

    it('Godan Verb [む]', () => {
        const word = new Word('読む', 'よむ', WordType.GodanVerb)
        const result = new CausativeAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('読ませる', 'よませる', WordType.GodanVerb))
    });

    it('Godan Verb [ぶ]', () => {
        const word = new Word('遊ぶ', 'あそぶ', WordType.GodanVerb)
        const result = new CausativeAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('遊ばせる', 'あそばせる', WordType.GodanVerb))
    });

    it('Godan Verb [ぬ]', () => {
        const word = new Word('死ぬ', 'しぬ', WordType.GodanVerb)
        const result = new CausativeAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('死なせる', 'しなせる', WordType.GodanVerb))
    });

    it('Godan Verb [く]', () => {
        const word = new Word('書く', 'かく', WordType.GodanVerb)
        const result = new CausativeAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('書かせる', 'かかせる', WordType.GodanVerb))
    });

    it('Godan Verb [ぐ]', () => {
        const word = new Word('泳ぐ', 'およぐ', WordType.GodanVerb)
        const result = new CausativeAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('泳がせる', 'およがせる', WordType.GodanVerb))
    });

    it('Godan Verb [す]', () => {
        const word = new Word('話す', 'はなす', WordType.GodanVerb)
        const result = new CausativeAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('話させる', 'はなさせる', WordType.GodanVerb))
    });

    it('Godan Verb [行く]', () => {
        const word = new Word('行く', 'いく', WordType.GodanVerb)
        const result = new CausativeAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('行かせる', 'いかせる', WordType.GodanVerb))
    });

    it('Suru Verb', () => {
        const word = new Word('勉強する', 'べんきょうする', WordType.SuruVerb)
        const result = new CausativeAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('勉強させる', 'べんきょうさせる', WordType.SuruVerb))
    });

    it('Kuru Verb', () => {
        const word = new Word('来る', 'くる', WordType.KuruVerb)
        const result = new CausativeAffirmative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('来させる', 'こさせる', WordType.KuruVerb))
    });
})
