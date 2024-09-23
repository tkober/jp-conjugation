import {Injectable} from '@angular/core';
import {NonPastShortNegative} from "../conjugation/forms/non-past-short-negative";
import {NonPastShortAffirmative} from "../conjugation/forms/non-past-short-affirmative";
import {NonPastPoliteAffirmative} from "../conjugation/forms/non-past-polite-affirmative";
import {NonPastPoliteNegative} from "../conjugation/forms/non-past-polite-negative";
import {PastShortAffirmative} from "../conjugation/forms/past-short-affirmative";
import {PastShortNegative} from "../conjugation/forms/past-short-negative";
import {PastPoliteAffirmative} from "../conjugation/forms/past-polite-affirmative";
import {PastPoliteNegative} from "../conjugation/forms/past-polite-negative";
import {TeFormAffirmative} from "../conjugation/forms/te-form-affirmative";
import {TeFormNegative} from "../conjugation/forms/te-form-negative";
import {PotentialAffirmative} from "../conjugation/forms/potential-affirmative";
import {PotentialNegative} from "../conjugation/forms/potential-negative";
import {PassiveAffirmative} from "../conjugation/forms/passive-affirmative";
import {PassiveNegative} from "../conjugation/forms/passive-negative";
import {CausativeAffirmative} from "../conjugation/forms/causative-affirmative";
import {CausativeNegative} from "../conjugation/forms/causative-negative";
import {CausativePassiveAffirmative} from "../conjugation/forms/causative-passive-affirmative";
import {CausativePassiveNegative} from "../conjugation/forms/causative-passive-negative";
import {ImperativeAffirmative} from "../conjugation/forms/imperative-affirmative";
import {ImperativeNegative} from "../conjugation/forms/imperative-negative";
import {jisho} from "../jisho";
import {Conjugation, WordType} from "../conjugation/conjugation";
import {PersistentService} from "./persistent-service";
import {SrsService} from "./srs.service";


export class Vocabulary {
    public kanji: string;
    public hiragana: string;
    public english: string;
    public jlpt: string;

    constructor(kanji: string, hiragana: string, english: string, jlpt: string) {
        this.kanji = kanji;
        this.hiragana = hiragana;
        this.english = english;
        this.jlpt = jlpt;
    }
}

export class PracticeItem {
    public conjugation: Conjugation;
    public wordType: WordType;
    public srsKey: string;

    constructor(conjugation: Conjugation, wordType: WordType, srsKey: string) {
        this.conjugation = conjugation;
        this.wordType = wordType;
        this.srsKey = srsKey;
    }
}

export class Exercise {
    public practiceItem: PracticeItem;
    public vocabulary: Vocabulary;

    constructor(practiceItem: PracticeItem, vocabulary: any) {
        this.practiceItem = practiceItem;
        this.vocabulary = vocabulary;
    }
}

export const LocalStorageKey_ExcludedConjugations = 'EXCLUDED_CONJUGATIONS'
export const LocalStorageKey_ExcludedJpltLevels = 'EXCLUDED_JLPT_LEVELS'


@Injectable({
    providedIn: 'root'
})
export class PracticeService extends PersistentService {

    public adjectiveForms: any = {
        // Non-past
        Adjectives__NonPastShortAffirmative: new NonPastShortAffirmative(),
        Adjectives__NonPastShortNegative: new NonPastShortNegative(),
        Adjectives__NonPastPoliteAffirmative: new NonPastPoliteAffirmative(),
        Adjectives__NonPastPoliteNegative: new NonPastPoliteNegative(),

        // Past
        Adjectives__PastShortAffirmative: new PastShortAffirmative(),
        Adjectives__PastShortNegative: new PastShortNegative(),
        Adjectives__PastPoliteAffirmative: new PastPoliteAffirmative(),
        Adjectives__PastPoliteNegative: new PastPoliteNegative(),
    }

    public verbForms: any = {
        // Non-past
        Verbs__NonPastShortAffirmative: new NonPastShortAffirmative(),
        Verbs__NonPastShortNegative: new NonPastShortNegative(),
        Verbs__NonPastPoliteNegative: new NonPastPoliteNegative(),
        Verbs__NonPastPoliteAffirmative: new NonPastPoliteAffirmative(),

        // Past
        Verbs__PastShortAffirmative: new PastShortAffirmative(),
        Verbs__PastShortNegative: new PastShortNegative(),
        Verbs__PastPoliteAffirmative: new PastPoliteAffirmative(),
        Verbs__PastPoliteNegative: new PastPoliteNegative(),

        // Te-Form
        Verbs__TeFormAffirmative: new TeFormAffirmative(),
        Verbs__TeFormNegative: new TeFormNegative(),

        // Potential
        Verbs__PotentialAffirmative: new PotentialAffirmative(),
        Verbs__PotentialNegative: new PotentialNegative(),

        // Passive
        Verbs__PassiveAffirmative: new PassiveAffirmative(),
        Verbs__PassiveNegative: new PassiveNegative(),

        // Causative
        Verbs__CausativeAffirmative: new CausativeAffirmative(),
        Verbs__CausativeNegative: new CausativeNegative(),

        // Causative Passive
        Verbs__CausativePassiveAffirmative: new CausativePassiveAffirmative(),
        Verbs__CausativePassiveNegative: new CausativePassiveNegative(),

        // Imperative
        Verbs__ImperativeAffirmative: new ImperativeAffirmative(),
        Verbs__ImperativeNegative: new ImperativeNegative()
    }


    private practiceItems: PracticeItem[];
    private vocabulary: any;
    private excludedForms: string[]
    private excludedJlptLevels: string[]

    constructor(private srs: SrsService) {
        super();
        this.initialize()
    }

    public initialize() {
        this.excludedForms = this.loadFromLocalStorage(LocalStorageKey_ExcludedConjugations, [])
        this.excludedJlptLevels = this.loadFromLocalStorage(LocalStorageKey_ExcludedJpltLevels, [])

        // Filter out disabled forms
        const selectedAdjectiveForms = Object.keys(this.adjectiveForms).filter((key) => this.excludedForms.indexOf(key) === -1);
        const selectedVerbForms = Object.keys(this.verbForms).filter((key) => this.excludedForms.indexOf(key) === -1);

        // Build Practice Items
        const practiceItems: PracticeItem[] = []

        // Adjective Practice Items
        for (let formKey of selectedAdjectiveForms) {
            for (let wordType of [WordType.IAdjective, WordType.NaAdjective]) {
                practiceItems.push(new PracticeItem(
                    this.adjectiveForms[formKey], wordType, `${this.adjectiveForms[formKey].constructor.name}__${wordType}`
                ))
            }
        }

        // Verbs Practice Items
        for (let formKey of selectedVerbForms) {
            for (let wordType of [WordType.IchidanVerb, WordType.GodanVerb, WordType.SuruVerb, WordType.KuruVerb]) {
                practiceItems.push(new PracticeItem(
                    this.verbForms[formKey], wordType, `${this.verbForms[formKey].constructor.name}__${wordType}`
                ))
            }
        }
        this.practiceItems = practiceItems;

        // Build vocabulary build on selected levels
        this.vocabulary = {
            'ichidan_verb': jisho.ichidan_verb.filter((word) => this.excludedJlptLevels.indexOf(word.jlpt) === -1),
            'godan_verb': jisho.godan_verb.filter((word) => this.excludedJlptLevels.indexOf(word.jlpt) === -1),
            'suru_verb': jisho.suru_verb.filter((word) => this.excludedJlptLevels.indexOf(word.jlpt) === -1),
            'kuru_verb': jisho.kuru_verb.filter((word) => this.excludedJlptLevels.indexOf(word.jlpt) === -1),
            'i_adjective': jisho.i_adjective.filter((word) => this.excludedJlptLevels.indexOf(word.jlpt) === -1),
            'na_adjective': jisho.na_adjective.filter((word) => this.excludedJlptLevels.indexOf(word.jlpt) === -1),
        }
    }

    public nextExercise(): Exercise {

        const practiceItem: PracticeItem = this.drawRandom(this.practiceItems);
        let word = this.drawRandom(this.vocabulary[practiceItem.wordType.valueOf()])

        return new Exercise(practiceItem, word)
    }

    private drawRandom(items: any[]): any {
        return items[Math.floor(Math.random() * items.length)];
    }

    getExcludedForms(): string[] {
        return this.excludedForms;
    }

    getExcludedJlptLevels(): string[] {
        return this.excludedJlptLevels;
    }
}
