import {Word, WordType} from "../conjugation";
import {CausativePassiveNegative} from "./causative-passive-negative";


describe('CausativePassiveNegative', () => {

    it('Ichidan Verb', () => {
        const word = new Word('食べる', 'たべる', WordType.IchidanVerb)
        const result = new CausativePassiveNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('食べさせられない', 'たべさせられない', WordType.IchidanVerb));
    });

    it('Godan Verb [う]', () => {
        const word = new Word('会う', 'あう', WordType.GodanVerb)
        const result = new CausativePassiveNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('会わせられない', 'あわせられない', WordType.GodanVerb))
    });

    it('Godan Verb [つ]', () => {
        const word = new Word('待つ', 'まつ', WordType.GodanVerb)
        const result = new CausativePassiveNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('待たせられない', 'またせられない', WordType.GodanVerb))
    });

    it('Godan Verb [る]', () => {
        const word = new Word('取る', 'とる', WordType.GodanVerb)
        const result = new CausativePassiveNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('取らせられない', 'とらせられない', WordType.GodanVerb))
    });

    it('Godan Verb [む]', () => {
        const word = new Word('読む', 'よむ', WordType.GodanVerb)
        const result = new CausativePassiveNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('読ませられない', 'よませられない', WordType.GodanVerb))
    });

    it('Godan Verb [ぶ]', () => {
        const word = new Word('遊ぶ', 'あそぶ', WordType.GodanVerb)
        const result = new CausativePassiveNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('遊ばせられない', 'あそばせられない', WordType.GodanVerb))
    });

    it('Godan Verb [ぬ]', () => {
        const word = new Word('死ぬ', 'しぬ', WordType.GodanVerb)
        const result = new CausativePassiveNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('死なせられない', 'しなせられない', WordType.GodanVerb))
    });

    it('Godan Verb [く]', () => {
        const word = new Word('書く', 'かく', WordType.GodanVerb)
        const result = new CausativePassiveNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('書かせられない', 'かかせられない', WordType.GodanVerb))
    });

    it('Godan Verb [ぐ]', () => {
        const word = new Word('泳ぐ', 'およぐ', WordType.GodanVerb)
        const result = new CausativePassiveNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('泳がせられない', 'およがせられない', WordType.GodanVerb))
    });

    it('Godan Verb [す]', () => {
        const word = new Word('話す', 'はなす', WordType.GodanVerb)
        const result = new CausativePassiveNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('話させられない', 'はなさせられない', WordType.GodanVerb))
    });

    it('Godan Verb [行く]', () => {
        const word = new Word('行く', 'いく', WordType.GodanVerb)
        const result = new CausativePassiveNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('行かせられない', 'いかせられない', WordType.GodanVerb))
    });

    it('Suru Verb', () => {
        const word = new Word('勉強する', 'べんきょうする', WordType.SuruVerb)
        const result = new CausativePassiveNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('勉強させられない', 'べんきょうさせられない', WordType.SuruVerb))
    });

    it('Kuru Verb', () => {
        const word = new Word('来る', 'くる', WordType.KuruVerb)
        const result = new CausativePassiveNegative().getConjugation(word)

        expect(result !== undefined).toBeTruthy()
        expect(result).toEqual(new Word('来させられない', 'こさせられない', WordType.KuruVerb))
    });
})
