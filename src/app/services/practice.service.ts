import {Injectable} from '@angular/core';
import {jisho} from "../jisho";
import {AdjectiveForms, composeAdjectiveSrsKey, composeVerbsSrsKey, Conjugation, VerbForms, WordType} from "../conjugation/conjugation";
import {LocalStorageKey_ExcludedConjugations, LocalStorageKey_ExcludedJpltLevels, PersistentService} from "./persistent-service";
import {SrsItem, SrsService} from "./srs.service";


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


@Injectable({
    providedIn: 'root'
})
export class PracticeService extends PersistentService {

    private practiceItems: Map<string, PracticeItem> = new Map();
    private vocabulary: any;
    private excludedForms: string[];
    private excludedJlptLevels: string[];
    private srsQueue: SrsItem[] = [];

    private static readonly SRS_QUEUE_SIZE = 5;

    constructor(private srs: SrsService) {
        super();
        this.initialize()
    }

    public initialize() {
        this.excludedForms = this.loadFromStorage(LocalStorageKey_ExcludedConjugations, [])
        this.excludedJlptLevels = this.loadFromStorage(LocalStorageKey_ExcludedJpltLevels, [])

        // Filter out disabled forms
        const selectedAdjectiveForms = Object.keys(AdjectiveForms).filter((key) => this.excludedForms.indexOf(key) === -1);
        const selectedVerbForms = Object.keys(VerbForms).filter((key) => this.excludedForms.indexOf(key) === -1);

        // Build Practice Items
        const practiceItems: Map<string, PracticeItem> = new Map();

        // Adjective Practice Items
        for (let formKey of selectedAdjectiveForms) {
            for (let wordType of [WordType.IAdjective, WordType.NaAdjective]) {
                const srsKey = composeAdjectiveSrsKey(formKey, wordType);
                practiceItems.set(srsKey, new PracticeItem(AdjectiveForms[formKey], wordType, srsKey))
            }
        }

        // Verbs Practice Items
        for (let formKey of selectedVerbForms) {
            for (let wordType of [WordType.IchidanVerb, WordType.GodanVerb, WordType.SuruVerb, WordType.KuruVerb]) {
                const srsKey = composeVerbsSrsKey(formKey, wordType);
                practiceItems.set(srsKey, new PracticeItem(VerbForms[formKey], wordType, srsKey))
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

    public newExerciseQueue(): SrsItem[] {
        const consideredForms = Array.from(this.practiceItems.keys())
        return this.srs.getItemQueue(consideredForms, PracticeService.SRS_QUEUE_SIZE)

    }

    public nextExercise(): Exercise {
        if (this.srsQueue.length < 1) {
            this.srsQueue = this.newExerciseQueue();
        }
        const srsItem = this.srsQueue.shift();

        let practiceItem: PracticeItem = this.drawRandom(Array.from(this.practiceItems.values()));
        if (srsItem) {
            const item = this.practiceItems.get(srsItem.key);
            if (item) {
                practiceItem = item;
            }
        }

        let word = this.drawRandom(this.vocabulary[practiceItem.wordType.valueOf()])
        return new Exercise(practiceItem, word)
    }

    public feedbackForExercise(exercise: Exercise, isCorrect: boolean) {
        const srsItem = this.srs.stateForForm(exercise.practiceItem.srsKey)
        if (isCorrect) {
            srsItem.success(new Date());
        } else {
            srsItem.fail(new Date());
        }

        this.srs.updateStateForForm(exercise.practiceItem.srsKey, srsItem);
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
