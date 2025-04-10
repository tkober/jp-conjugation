import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import * as wanakana from 'wanakana';
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {Exercise, PracticeService, Vocabulary} from "./services/practice.service";
import {Word, WordType} from "./conjugation/conjugation";
import {MatDialog} from "@angular/material/dialog";
import {SettingsDialogComponent} from "./settings-dialog/settings-dialog.component";
import { SrsDialogComponent } from './srs-dialog/srs-dialog.component';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
    public answerFormControl = new FormControl('', [
        Validators.required,
        AppComponent.isHiragana
    ])
    public formGroup = new FormGroup({
        'answer': this.answerFormControl
    });

    @ViewChild('answerInput') answerInput: ElementRef;

    public currentExercise: Exercise;
    public isAnswered: boolean = false;
    public isAnswerCorrect: boolean;
    public givenAnswer: string;
    public solution: Word;

    constructor(private practiceService: PracticeService, private dialog: MatDialog) {
    }

    ngOnInit() {
        this.nextExercise()
    }

    ngAfterViewInit(): void {
        wanakana.bind(this.answerInput.nativeElement)
    }

    checkAnswer() {
        if (!this.formGroup.valid) {
            return;
        }

        this.isAnswered = true;

        this.givenAnswer = wanakana.toHiragana(this.answerInput.nativeElement.value);
        const word = new Word(
            this.currentExercise.vocabulary.kanji,
            this.currentExercise.vocabulary.hiragana,
            this.currentExercise.practiceItem.wordType
        )

        const solution = this.currentExercise.practiceItem.conjugation.getConjugation(word)
        if (!solution) {
            // TODO: Raise error
            return;
        }

        this.solution = solution
        this.isAnswerCorrect = this.givenAnswer === this.solution.hiragana
        this.practiceService.feedbackForExercise(this.currentExercise, this.isAnswerCorrect);
    }

    finishCurrentExercise() {
        this.nextExercise()
    }

    openSettings() {
        const dialogRef = this.dialog.open(SettingsDialogComponent, {panelClass: 'settings-dialog-pane'})
        dialogRef.afterClosed().subscribe(value => {
            this.practiceService.initialize();
            this.nextExercise();
        })
    }

    openSrs() {
        const dialogRef = this.dialog.open(SrsDialogComponent, {panelClass: 'srs-dialog-pane'})
        dialogRef.afterClosed().subscribe(value => {
            this.practiceService.initialize();
            this.nextExercise();
        })
    }

    public conjugationRuleHeadlineForWord(word: Word): string {
        switch (word.wordType) {
            case WordType.IAdjective:
                return 'い-Adjective'

            case WordType.NaAdjective:
                return 'な-Adjective'

            case WordType.KuruVerb:
                return 'Kuru Verb'

            case WordType.SuruVerb:
                return 'Suru Verb'

            case WordType.IchidanVerb:
                return 'Ichidan Verb'

            case WordType.GodanVerb:
                return `Godan Verb [${this.currentExercise.vocabulary.hiragana.slice(-1)}]`
        }
    }

    private static isHiragana(formControl: FormControl) {
        const value = wanakana.toHiragana(formControl.value)
        if (!wanakana.isHiragana(value)) {
            return {
                invalidAnswer: {
                    message: 'Please write your answer in Kana.'
                }
            }
        }
        return null;
    }

    private nextExercise() {
        this.isAnswered = false;
        this.answerFormControl.setValue('');

        this.currentExercise = this.practiceService.nextExercise();
    }

    protected readonly WordType = WordType;
}
