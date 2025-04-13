import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from "@angular/material/dialog";
import { SrsService } from '../services/srs.service';
import { AdjectiveTypes, VerbTypes, composeSrsKey } from '../conjugation/conjugation';
import {
  AdjectiveForms,
  Adjectives__NonePast_Forms,
  Adjectives__Past_Forms,
  Verbs__Causative_Forms,
  Verbs__CausativePassive_Forms,
  Verbs__Imperative_Forms,
  Verbs__NonPast_Forms,
  Verbs__Passive_Forms,
  Verbs__Past_Forms,
  Verbs__Potential_Forms,
  Verbs__TeForm_Forms
} from "../conjugation/conjugation";
import { ConjugationGroup } from '../dtos';
import { ProgressItem } from '../srs-progress/srs-progress.component';

@Component({
  selector: 'app-srs-dialog',
  templateUrl: './srs-dialog.component.html',
  styleUrls: ['./srs-dialog.component.css']
})
export class SrsDialogComponent implements OnInit {

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

  public progressCategories: Map<string, ConjugationGroup[]> = new Map<string, Array<ConjugationGroup>>();

  constructor(
    private dialogRef: MatDialogRef<SrsDialogComponent>,
    private srsService: SrsService
  ) {
    this.progressCategories.set('Adjectives', this.adjectiveConjugationGroups);
    this.progressCategories.set('Verbs', this.verbConjugationGroups);
  }

  public progressItemsFromConjugationGroup(group: ConjugationGroup): ProgressItem[] {
    const result: ProgressItem[] = []

    for (let form of group.items) {
      for (let wordType of group.wordTypes) {
        result.push(new ProgressItem(
          group.title,
          form.conjugation.getSettingsTitle(),
          wordType,
          composeSrsKey(form.settingsKey, wordType)
        ))
      }
    }

    return result;
  }

  ngOnInit(): void {
  }

  public close() {
    this.dialogRef.close();
  }

}
