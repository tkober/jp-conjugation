import { Conjugation } from './conjugation/conjugation';


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

    constructor(title: string, items: ConjugationGroupItem[]) {
        this.title = title;
        this.items = items;
    }

    static groupFromForms(name: string, forms: any): ConjugationGroup {
        let items = [];
        for (const form in forms) {
            items.push(new ConjugationGroupItem(form, forms[form]));
        }

        return new ConjugationGroup(name, items);
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
