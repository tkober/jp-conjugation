import {Component, OnInit} from '@angular/core';
import {MatDialogRef} from "@angular/material/dialog";
import {
    AdjectiveForms,
    Adjectives__NonePast_Forms,
    Adjectives__Past_Forms,
    AdjectiveTypes,
    Verbs__Causative_Forms,
    Verbs__CausativePassive_Forms,
    Verbs__Imperative_Forms,
    Verbs__NonPast_Forms,
    Verbs__Passive_Forms,
    Verbs__Past_Forms,
    Verbs__Potential_Forms,
    Verbs__TeForm_Forms,
    VerbTypes
} from "../conjugation/conjugation";
import {PracticeService} from "../services/practice.service";
import { StorageKey_ExcludedConjugations, StorageKey_ExcludedJpltLevels } from '../services/persistent-service';
import { ConjugationGroup, VocabularyItem } from '../dtos';


@Component({
    selector: 'app-settings-dialog',
    templateUrl: './settings-dialog.component.html',
    styleUrls: ['./settings-dialog.component.css']
})
export class SettingsDialogComponent implements OnInit {

    public adjectiveConjugationGroups = [
        ConjugationGroup.groupFromForms('Non-past', Adjectives__NonePast_Forms, AdjectiveTypes),
        ConjugationGroup.groupFromForms('Past', Adjectives__Past_Forms, AdjectiveTypes),
      ]
    
    
      public verbConjugationGroups = [
        ConjugationGroup.groupFromForms('Non-past', Verbs__NonPast_Forms, VerbTypes),
        ConjugationGroup.groupFromForms('Past', Verbs__Past_Forms, VerbTypes),
        ConjugationGroup.groupFromForms('Te-Form', Verbs__TeForm_Forms, VerbTypes),
        ConjugationGroup.groupFromForms('Potential', Verbs__Potential_Forms, VerbTypes),
        ConjugationGroup.groupFromForms('Passive', Verbs__Passive_Forms, VerbTypes),
        ConjugationGroup.groupFromForms('Causative', Verbs__Causative_Forms, VerbTypes),
        ConjugationGroup.groupFromForms('Causative-Passive', Verbs__CausativePassive_Forms, VerbTypes),
        ConjugationGroup.groupFromForms('Imperative', Verbs__Imperative_Forms, VerbTypes),
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

        localStorage.setItem(StorageKey_ExcludedConjugations, JSON.stringify(excludedConjugationKeys))
        localStorage.setItem(StorageKey_ExcludedJpltLevels, JSON.stringify(excludedJlptKeys))

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
