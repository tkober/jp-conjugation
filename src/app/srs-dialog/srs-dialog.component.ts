import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from "@angular/material/dialog";
import { SrsService } from '../services/srs.service';
import { VerbForms } from '../conjugation/conjugation';
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

@Component({
  selector: 'app-srs-dialog',
  templateUrl: './srs-dialog.component.html',
  styleUrls: ['./srs-dialog.component.css']
})
export class SrsDialogComponent implements OnInit {

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

  constructor(
    private dialogRef: MatDialogRef<SrsDialogComponent>,
    private srsService: SrsService
  ) {
    for (const verbFormKey in VerbForms) {
      const verbForm = VerbForms[verbFormKey]

    }
  }

  ngOnInit(): void {
  }

  public close() {
    this.dialogRef.close();
  }

}
