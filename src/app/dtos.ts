import { Conjugation, WordType } from './conjugation/conjugation';


class ConjugationGroupItem {
    public settingsKey: string;
    public conjugation: Conjugation;
    public checked = false;

    constructor(settingsKey: string, conjugation: Conjugation) {
        this.settingsKey = settingsKey;
        this.conjugation = conjugation;
    }
}
export class ConjugationGroup {
    public title: string;
    public items: ConjugationGroupItem[];
    public wordTypes: WordType[];

    constructor(title: string, items: ConjugationGroupItem[], wordTypes: WordType[]) {
        this.title = title;
        this.items = items;
        this.wordTypes = wordTypes;
    }

    static groupFromForms(name: string, forms: any, wordTypes: WordType[]): ConjugationGroup {
        let items = [];
        for (const form in forms) {
            items.push(new ConjugationGroupItem(form, forms[form]));
        }

        return new ConjugationGroup(name, items, wordTypes);
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
