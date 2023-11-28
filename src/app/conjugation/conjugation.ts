export enum WordType {
    IchidanVerb = 'ichidan_verb',
    GodanVerb = 'godan_verb',
    SuruVerb = 'suru_verb',
    KuruVerb = 'kuru_verb',
    IAdjective = 'i_adjective',
    NaAdjective = 'na_adjective'
}

export class Word {
    public kanji: string;
    public furigana: string;
    public wordType: WordType;

    constructor(kanji: string, furigana: string, wordType: WordType) {
        this.kanji = kanji
        this.furigana = furigana
        this.wordType = wordType;
    }

    // @ts-ignore
    addSuffix(suffix: string): Word {
        return new Word(
            this.kanji + suffix,
            this.furigana + suffix,
            this.wordType
        )
    }

    getLastKana(): string {
        return this.furigana.slice(-1);
    }

    // @ts-ignore
    replaceLastKana(replacement: string, n: number = 1): Word {
        return new Word(
            this.kanji.slice(0, -n) + replacement,
            this.furigana.slice(0, -n) + replacement,
            this.wordType
        )
    }

    changeType(newType: WordType): Word {
        this.wordType = newType;
        return this;
    }

    equals(anotherWord: Word): boolean {
        return this.kanji === anotherWord.kanji &&
            this.furigana === anotherWord.furigana &&
            this.wordType === anotherWord.wordType;
    }
}

export interface Conjugation {

    getConjugation(word: Word): (Word | undefined)

    getTitle(): string

    getSettingsTitle(): string;
}
