import {Injectable} from '@angular/core';
import {jisho} from "../jisho";
import {AdjectiveForms, Conjugation, VerbForms, WordType} from "../conjugation/conjugation";
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
        const selectedAdjectiveForms = Object.keys(AdjectiveForms).filter((key) => this.excludedForms.indexOf(key) === -1);
        const selectedVerbForms = Object.keys(VerbForms).filter((key) => this.excludedForms.indexOf(key) === -1);

        // Build Practice Items
        const practiceItems: PracticeItem[] = []

        // Adjective Practice Items
        for (let formKey of selectedAdjectiveForms) {
            for (let wordType of [WordType.IAdjective, WordType.NaAdjective]) {
                practiceItems.push(new PracticeItem(
                    AdjectiveForms[formKey], wordType, `${AdjectiveForms[formKey].constructor.name}__${wordType}`
                ))
            }
        }

        // Verbs Practice Items
        for (let formKey of selectedVerbForms) {
            for (let wordType of [WordType.IchidanVerb, WordType.GodanVerb, WordType.SuruVerb, WordType.KuruVerb]) {
                practiceItems.push(new PracticeItem(
                    VerbForms[formKey], wordType, `${VerbForms[formKey].constructor.name}__${wordType}`
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

        console.log(practiceItem.srsKey)
        console.log(this.srs.stateForForm(practiceItem.srsKey))

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
