import {Component, OnInit} from '@angular/core';
import {MatDialogRef} from "@angular/material/dialog";
import {
    Adjectives__NonPastPoliteAffirmative,
    Adjectives__NonPastPoliteNegative,
    Adjectives__NonPastShortAffirmative,
    Adjectives__NonPastShortNegative,
    Adjectives__PastPoliteAffirmative,
    Adjectives__PastPoliteNegative,
    Adjectives__PastShortAffirmative,
    Adjectives__PastShortNegative, LocalStorageKey_ExcludedConjugations, LocalStorageKey_ExcludedJpltLevels,
    PracticeService,
    Verbs__CausativeAffirmative,
    Verbs__CausativeNegative,
    Verbs__CausativePassiveAffirmative,
    Verbs__CausativePassiveNegative,
    Verbs__ImperativeAffirmative,
    Verbs__ImperativeNegative,
    Verbs__NonPastPoliteAffirmative,
    Verbs__NonPastPoliteNegative,
    Verbs__NonPastShortAffirmative,
    Verbs__NonPastShortNegative,
    Verbs__PassiveAffirmative,
    Verbs__PassiveNegative,
    Verbs__PastPoliteAffirmative,
    Verbs__PastPoliteNegative,
    Verbs__PastShortAffirmative,
    Verbs__PastShortNegative,
    Verbs__PotentialAffirmative,
    Verbs__PotentialNegative,
    Verbs__TeFormAffirmative,
    Verbs__TeFormNegative
} from "../services/practice.service";
import {Conjugation} from "../conjugation/conjugation";
import {NonPastShortAffirmative} from "../conjugation/forms/non-past-short-affirmative";
import {NonPastShortNegative} from "../conjugation/forms/non-past-short-negative";
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
        new ConjugationGroup('Non-past', [
            new ConjugationGroupItem(Adjectives__NonPastShortAffirmative, new NonPastShortAffirmative()),
            new ConjugationGroupItem(Adjectives__NonPastShortNegative, new NonPastShortNegative(),),
            new ConjugationGroupItem(Adjectives__NonPastPoliteAffirmative, new NonPastPoliteAffirmative(),),
            new ConjugationGroupItem(Adjectives__NonPastPoliteNegative, new NonPastPoliteNegative()),
        ]),

        new ConjugationGroup('Past', [
            new ConjugationGroupItem(Adjectives__PastShortAffirmative, new PastShortAffirmative()),
            new ConjugationGroupItem(Adjectives__PastShortNegative, new PastShortNegative(),),
            new ConjugationGroupItem(Adjectives__PastPoliteAffirmative, new PastPoliteAffirmative(),),
            new ConjugationGroupItem(Adjectives__PastPoliteNegative, new PastPoliteNegative()),
        ]),
    ]

    public verbConjugationGroups = [
        new ConjugationGroup('Non-past', [
            new ConjugationGroupItem(Verbs__NonPastShortAffirmative, new NonPastShortAffirmative()),
            new ConjugationGroupItem(Verbs__NonPastShortNegative, new NonPastShortNegative(),),
            new ConjugationGroupItem(Verbs__NonPastPoliteAffirmative, new NonPastPoliteAffirmative(),),
            new ConjugationGroupItem(Verbs__NonPastPoliteNegative, new NonPastPoliteNegative()),
        ]),

        new ConjugationGroup('Past', [
            new ConjugationGroupItem(Verbs__PastShortAffirmative, new PastShortAffirmative()),
            new ConjugationGroupItem(Verbs__PastShortNegative, new PastShortNegative(),),
            new ConjugationGroupItem(Verbs__PastPoliteAffirmative, new PastPoliteAffirmative(),),
            new ConjugationGroupItem(Verbs__PastPoliteNegative, new PastPoliteNegative()),
        ]),

        new ConjugationGroup('Te-Form', [
            new ConjugationGroupItem(Verbs__TeFormAffirmative, new TeFormAffirmative()),
            new ConjugationGroupItem(Verbs__TeFormNegative, new TeFormNegative()),
        ]),

        new ConjugationGroup('Potential', [
            new ConjugationGroupItem(Verbs__PotentialAffirmative, new PotentialAffirmative()),
            new ConjugationGroupItem(Verbs__PotentialNegative, new PotentialNegative()),
        ]),

        new ConjugationGroup('Passive', [
            new ConjugationGroupItem(Verbs__PassiveAffirmative, new PassiveAffirmative()),
            new ConjugationGroupItem(Verbs__PassiveNegative, new PassiveNegative()),
        ]),

        new ConjugationGroup('Causative', [
            new ConjugationGroupItem(Verbs__CausativeAffirmative, new CausativeAffirmative()),
            new ConjugationGroupItem(Verbs__CausativeNegative, new CausativeNegative()),
        ]),

        new ConjugationGroup('Causative-Passive', [
            new ConjugationGroupItem(Verbs__CausativePassiveAffirmative, new CausativePassiveAffirmative()),
            new ConjugationGroupItem(Verbs__CausativePassiveNegative, new CausativePassiveNegative()),
        ]),

        new ConjugationGroup('Imperative', [
            new ConjugationGroupItem(Verbs__ImperativeAffirmative, new ImperativeAffirmative()),
            new ConjugationGroupItem(Verbs__ImperativeNegative, new ImperativeNegative()),
        ]),
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
        console.log("ngOnInit()")
    }

    public getAdjectiveConjugationTitle(key: string): string {
        return this.practiceService.adjectiveForms[key].getTitle()
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
}
