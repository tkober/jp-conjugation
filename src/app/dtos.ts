import { AdjectiveTypes, Conjugation, VerbTypes, WordType } from './conjugation/conjugation';


class ConjugationGroupItem {
    public settingsKey: string;
    public conjugation: Conjugation;
    public checked = false;

    constructor(settingsKey: string, conjugation: Conjugation) {
        this.settingsKey = settingsKey;
        this.conjugation = conjugation;
    }
}

export enum ConjugationType {
    Adjective = 'adjective',
    Verb = 'Verb'
}

export class ConjugationGroup {
    public title: string;
    public items: ConjugationGroupItem[];
    public type: ConjugationType;

    constructor(title: string, items: ConjugationGroupItem[], type: ConjugationType) {
        this.title = title;
        this.items = items;
        this.type = type;
    }

    getWordTypes(): WordType[] {
        switch (this.type) {
            case ConjugationType.Adjective:
                return AdjectiveTypes;
            case ConjugationType.Verb:
                return VerbTypes;
            default:
                return [];
        }
    }

    static groupFromForms(name: string, forms: any, type: ConjugationType): ConjugationGroup {
        let items = [];
        for (const form in forms) {
            items.push(new ConjugationGroupItem(form, forms[form]));
        }

        return new ConjugationGroup(name, items, type);
    }

    static groupForAdjectiveForms(name: string, forms: any): ConjugationGroup {
        return this.groupFromForms(name, forms, ConjugationType.Adjective);
    }

    static groupForVerbVerb(name: string, forms: any): ConjugationGroup {
        return this.groupFromForms(name, forms, ConjugationType.Verb);
    }
}

export class VocabularyItem {
    public title: string;
    public settingsKey: string;
    public checked = false;

    constructor(title: string, settingsKey: string) {
        this.title = title;
        this.settingsKey = settingsKey;
    }
}
