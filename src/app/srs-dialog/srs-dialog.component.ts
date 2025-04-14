import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from "@angular/material/dialog";
import { SrsService } from '../services/srs.service';
import { composeAdjectiveSrsKey, composeVerbsSrsKey } from '../conjugation/conjugation';
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
import { ConjugationGroup, ConjugationType } from '../dtos';
import { ProgressItem } from '../srs-progress/srs-progress.component';

@Component({
  selector: 'app-srs-dialog',
  templateUrl: './srs-dialog.component.html',
  styleUrls: ['./srs-dialog.component.css']
})
export class SrsDialogComponent implements OnInit {

  public adjectiveConjugationGroups = [
    ConjugationGroup.groupForAdjectiveForms('Non-past', Adjectives__NonePast_Forms),
    ConjugationGroup.groupForAdjectiveForms('Past', Adjectives__Past_Forms),
  ]

  public verbConjugationGroups = [
    ConjugationGroup.groupForVerbVerb('Non-past', Verbs__NonPast_Forms),
    ConjugationGroup.groupForVerbVerb('Past', Verbs__Past_Forms),
    ConjugationGroup.groupForVerbVerb('Te-Form', Verbs__TeForm_Forms),
    ConjugationGroup.groupForVerbVerb('Potential', Verbs__Potential_Forms),
    ConjugationGroup.groupForVerbVerb('Passive', Verbs__Passive_Forms),
    ConjugationGroup.groupForVerbVerb('Causative', Verbs__Causative_Forms),
    ConjugationGroup.groupForVerbVerb('Causative-Passive', Verbs__CausativePassive_Forms),
    ConjugationGroup.groupForVerbVerb('Imperative', Verbs__Imperative_Forms),
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
      for (let wordType of group.getWordTypes()) {

        let srsKey = ''
        if (group.type === ConjugationType.Adjective) {
            srsKey = composeAdjectiveSrsKey(form.settingsKey, wordType);
        }

        if (group.type === ConjugationType.Verb) {
            srsKey = composeVerbsSrsKey(form.settingsKey, wordType);
        }

        result.push(new ProgressItem(
          group.title,
          form.conjugation.getSettingsTitle(),
          wordType,
          srsKey
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
