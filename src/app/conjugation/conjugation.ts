export enum WordType {
    IchidanVerb = 'ichidan_verb',
    GodanVerb = 'godan_verb',
    SuruVerb = 'suru_verb',
    KuruVerb = 'kuru_verb',
    IAdjective = 'i_adjective',
    NaAdjective = 'na_adjective'
}


export class Transformation {
    private readonly _unaltered: string;
    private readonly _alteredPart: string;
    private readonly _alteration: string;
    private readonly _operation: string;

    private _previousTransformation: (Transformation | undefined) = undefined;

    constructor(unaltered: string, alteredPart: string, alteration: string, operation: string) {
        this._unaltered = unaltered;
        this._alteredPart = alteredPart;
        this._alteration = alteration;
        this._operation = operation;
    }

    get unaltered(): string {
        return this._unaltered;
    }

    get alteredPart(): string {
        return this._alteredPart;
    }

    get alteration(): string {
        return this._alteration;
    }

    get operation(): string {
        return this._operation;
    }

    get previousTransformation(): (Transformation | undefined) {
        return this._previousTransformation;
    }

    set previousTransformation(value: (Transformation | undefined)) {
        this._previousTransformation = value;
    }
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

    get transformations(): Transformation[] {
        return this._transformations;
    }

    private _kanji: string;
    private _hiragana: string;
    private _wordType: WordType;
    private _transformations: Transformation[] = [];

    private currentExplanationElement: string;

    constructor(kanji: string, hiragana: string, wordType: WordType) {
        this._kanji = kanji;
        this._hiragana = hiragana;
        this._wordType = wordType;
        this.currentExplanationElement = kanji;
    }

    // @ts-ignore
    addSuffix(suffix: string): Word {
        this._kanji = this._kanji + suffix;
        this._hiragana = this._hiragana + suffix

        this.addTransformation(new Transformation(
            this.currentExplanationElement,
            '',
            suffix,
            '+'
        ))
        return this;
    }

    getLastKana(): string {
        return this._hiragana.slice(-1);
    }

    // @ts-ignore
    replaceLastKana(replacement: string, n: number = 1): Word {
        this._kanji = this._kanji.slice(0, -n) + replacement;
        this._hiragana = this._hiragana.slice(0, -n) + replacement;

        this.addTransformation(new Transformation(
            this.currentExplanationElement.slice(0, -n),
            this.currentExplanationElement.slice(-n),
            replacement,
            '+'
        ))
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

        this.addTransformation(new Transformation(
            '',
            this.currentExplanationElement,
            kanji,
            '->'
        ))
        return this;
    }

    private addTransformation(transformation: Transformation) {
        if (this.transformations.length > 0) {
            transformation.previousTransformation = this.transformations[this.transformations.length-1]
        }

        this._transformations.push(transformation);
        this.currentExplanationElement = transformation.alteration;
    }
}

export interface Conjugation {

    getConjugation(word: Word): (Word | undefined)

    getTitle(): string

    getSettingsTitle(): string;
}

export const Adjectives__NonPastShortAffirmative = 'Adjectives__NonPastShortAffirmative';
export const Adjectives__NonPastShortNegative = 'Adjectives__NonPastShortNegative';
export const Adjectives__NonPastPoliteAffirmative = 'Adjectives__NonPastPoliteAffirmative';
export const Adjectives__NonPastPoliteNegative = 'Adjectives__NonPastPoliteNegative';
export const Adjectives__PastShortAffirmative = 'Adjectives__PastShortAffirmative';
export const Adjectives__PastShortNegative = 'Adjectives__PastShortNegative';
export const Adjectives__PastPoliteAffirmative = 'Adjectives__PastPoliteAffirmative';
export const Adjectives__PastPoliteNegative = 'Adjectives__PastPoliteNegative';
export const Verbs__NonPastShortAffirmative = 'Verbs__NonPastShortAffirmative';
export const Verbs__NonPastShortNegative = 'Verbs__NonPastShortNegative';
export const Verbs__NonPastPoliteNegative = 'Verbs__NonPastPoliteNegative';
export const Verbs__NonPastPoliteAffirmative = 'Verbs__NonPastPoliteAffirmative';
export const Verbs__PastShortAffirmative = 'Verbs__PastShortAffirmative';
export const Verbs__PastShortNegative = 'Verbs__PastShortNegative';
export const Verbs__PastPoliteAffirmative = 'Verbs__PastPoliteAffirmative';
export const Verbs__PastPoliteNegative = 'Verbs__PastPoliteNegative';
export const Verbs__TeFormAffirmative = 'Verbs__TeFormAffirmative';
export const Verbs__TeFormNegative = 'Verbs__TeFormNegative';
export const Verbs__PotentialAffirmative = 'Verbs__PotentialAffirmative';
export const Verbs__PotentialNegative = 'Verbs__PotentialNegative';
export const Verbs__PassiveAffirmative = 'Verbs__PassiveAffirmative';
export const Verbs__PassiveNegative = 'Verbs__PassiveNegative';
export const Verbs__CausativeAffirmative = 'Verbs__CausativeAffirmative';
export const Verbs__CausativeNegative = 'Verbs__CausativeNegative';
export const Verbs__CausativePassiveAffirmative = 'Verbs__CausativePassiveAffirmative';
export const Verbs__CausativePassiveNegative = 'Verbs__CausativePassiveNegative';
export const Verbs__ImperativeAffirmative = 'Verbs__ImperativeAffirmative';
export const Verbs__ImperativeNegative = 'Verbs__ImperativeNegative';
