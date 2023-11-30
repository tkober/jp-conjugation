export enum WordType {
    IchidanVerb = 'ichidan_verb',
    GodanVerb = 'godan_verb',
    SuruVerb = 'suru_verb',
    KuruVerb = 'kuru_verb',
    IAdjective = 'i_adjective',
    NaAdjective = 'na_adjective'
}

export class Word {

    get kanji(): string {
        return this._kanji;
    }

    get furigana(): string {
        return this._furigana;
    }

    get wordType(): WordType {
        return this._wordType;
    }
    private _kanji: string;
    private _furigana: string;
    private _wordType: WordType;

    constructor(kanji: string, furigana: string, wordType: WordType) {
        this._kanji = kanji
        this._furigana = furigana
        this._wordType = wordType;
    }

    // @ts-ignore
    addSuffix(suffix: string): Word {
        this._kanji = this._kanji + suffix;
        this._furigana = this._furigana + suffix
        return this;
    }

    getLastKana(): string {
        return this._furigana.slice(-1);
    }

    // @ts-ignore
    replaceLastKana(replacement: string, n: number = 1): Word {
        this._kanji = this._kanji.slice(0, -n) + replacement;
        this._furigana = this._furigana.slice(0, -n) + replacement;
        return this;
    }

    changeType(newType: WordType): Word {
        this._wordType = newType;
        return this;
    }

    equals(anotherWord: Word): boolean {
        return this._kanji === anotherWord._kanji &&
            this._furigana === anotherWord._furigana &&
            this._wordType === anotherWord._wordType;
    }

    replace(kanji: string, furigana: string): Word {
        this._kanji = kanji;
        this._furigana = furigana;
        return this;
    }
}

export interface Conjugation {

    getConjugation(word: Word): (Word | undefined)

    getTitle(): string

    getSettingsTitle(): string;
}
