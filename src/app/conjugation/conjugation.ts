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

    get hiragana(): string {
        return this._hiragana;
    }

    get wordType(): WordType {
        return this._wordType;
    }
    private _kanji: string;
    private _hiragana: string;
    private _wordType: WordType;

    constructor(kanji: string, hiragana: string, wordType: WordType) {
        this._kanji = kanji
        this._hiragana = hiragana
        this._wordType = wordType;
    }

    // @ts-ignore
    addSuffix(suffix: string): Word {
        this._kanji = this._kanji + suffix;
        this._hiragana = this._hiragana + suffix
        return this;
    }

    getLastKana(): string {
        return this._hiragana.slice(-1);
    }

    // @ts-ignore
    replaceLastKana(replacement: string, n: number = 1): Word {
        this._kanji = this._kanji.slice(0, -n) + replacement;
        this._hiragana = this._hiragana.slice(0, -n) + replacement;
        return this;
    }

    changeType(newType: WordType): Word {
        this._wordType = newType;
        return this;
    }

    equals(anotherWord: Word): boolean {
        return this._kanji === anotherWord._kanji &&
            this._hiragana === anotherWord._hiragana &&
            this._wordType === anotherWord._wordType;
    }

    replace(kanji: string, hiragana: string): Word {
        this._kanji = kanji;
        this._hiragana = hiragana;
        return this;
    }
}

export interface Conjugation {

    getConjugation(word: Word): (Word | undefined)

    getTitle(): string

    getSettingsTitle(): string;
}
