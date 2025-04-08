import {Component, OnInit} from '@angular/core';
import {MatDialogRef} from "@angular/material/dialog";
import {
    AdjectiveForms,
    Adjectives__NonePast_Forms,
    Adjectives__Past_Forms,
    Conjugation,
    Verbs__Causative_Forms,
    Verbs__CausativePassive_Forms,
    Verbs__Imperative_Forms,
    Verbs__NonPast_Forms,
    Verbs__Passive_Forms,
    Verbs__Past_Forms,
    Verbs__Potential_Forms,
    Verbs__TeForm_Forms
} from "../conjugation/conjugation";
import {PracticeService} from "../services/practice.service";
import { LocalStorageKey_ExcludedConjugations, LocalStorageKey_ExcludedJpltLevels } from '../services/persistent-service';


class ConjugationGroupItem {
    public settingsKey: string;
    public conjugation: Conjugation;
    public checked = false;

    constructor(settingsKey: string, conjugation: Conjugation) {
        this.settingsKey = settingsKey;
        this.conjugation = conjugation;
    }
}

class ConjugationGroup {
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

class VocabularyItem {
    public title: string;
    public settingsKey: string;
    public checked = false;

    constructor(title: string, settingsKey: string) {
        this.title = title;
        this.settingsKey = settingsKey;
    }
}

@Component({
    selector: 'app-settings-dialog',
    templateUrl: './settings-dialog.component.html',
    styleUrls: ['./settings-dialog.component.css']
})
export class SettingsDialogComponent implements OnInit {

    public adjectiveConjugationGroups = [
        ConjugationGroup.groupFromForms('Non-past', Adjectives__NonePast_Forms),
        ConjugationGroup.groupFromForms('Past', Adjectives__Past_Forms),
    ]

    public verbConjugationGroups = [
        ConjugationGroup.groupFromForms('Non-past', Verbs__NonPast_Forms),
        ConjugationGroup.groupFromForms('Past', Verbs__Past_Forms),
        ConjugationGroup.groupFromForms('Te-Form', Verbs__TeForm_Forms),
        ConjugationGroup.groupFromForms('Potential', Verbs__Potential_Forms),
        ConjugationGroup.groupFromForms('Passive', Verbs__Passive_Forms),
        ConjugationGroup.groupFromForms('Causative', Verbs__Causative_Forms),
        ConjugationGroup.groupFromForms('Causative-Passive', Verbs__CausativePassive_Forms),
        ConjugationGroup.groupFromForms('Imperative', Verbs__Imperative_Forms),
    ]

    public jlptItems = [
        new VocabularyItem('N1', 'n1'),
        new VocabularyItem('N2', 'n2'),
        new VocabularyItem('N3', 'n3'),
        new VocabularyItem('N4', 'n4'),
        new VocabularyItem('N5', 'n5')
    ]

    constructor(private dialogRef: MatDialogRef<SettingsDialogComponent>, private practiceService: PracticeService) {
        dialogRef.disableClose = true;

        this.jlptItems.forEach(level => {
            level.checked = (practiceService.getExcludedJlptLevels().indexOf(level.settingsKey) === -1)
        })

        this.adjectiveConjugationGroups.forEach(group => {
            group.items.forEach(item => {
                item.checked = (practiceService.getExcludedForms().indexOf(item.settingsKey) === -1)
            })
        })

        this.verbConjugationGroups.forEach(group => {
            group.items.forEach(item => {
                item.checked = (practiceService.getExcludedForms().indexOf(item.settingsKey) === -1)
            })
        })
    }

    ngOnInit(): void {
    }

    public getAdjectiveConjugationTitle(key: string): string {
        return AdjectiveForms[key].getTitle()
    }

    save() {
        const excludedJlptKeys: string[] = []
        for (let level of this.jlptItems) {
            if (!level.checked) {
                excludedJlptKeys.push(level.settingsKey)
            }
        }

        const excludedConjugationKeys: string[] = []
        for (let type of [this.adjectiveConjugationGroups, this.verbConjugationGroups]) {
            for (let group of type) {
                for (let item of group.items) {
                    if (!item.checked) {
                        excludedConjugationKeys.push(item.settingsKey)
                    }
                }
            }
        }

        localStorage.setItem(LocalStorageKey_ExcludedConjugations, JSON.stringify(excludedConjugationKeys))
        localStorage.setItem(LocalStorageKey_ExcludedJpltLevels, JSON.stringify(excludedJlptKeys))

        this.dialogRef.close();
    }

    setAllAdjectiveConjugations(checked: boolean) {
        this.adjectiveConjugationGroups.forEach(group => {
            group.items.forEach(item => {
                item.checked = checked
            })
        })
    }

    setAllVerbConjugations(checked: boolean) {
        this.verbConjugationGroups.forEach(group => {
            group.items.forEach(item => {
                item.checked = checked
            })
        })
    }
}
