import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import * as wanakana from 'wanakana';
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {Exercise, PracticeService, Vocabulary} from "./services/practice.service";
import {Word} from "./conjugation/conjugation";


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

    constructor(private practiceService: PracticeService) {
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
            this.currentExercise.vocabulary.furigana,
            this.currentExercise.practiceItem.wordType
        )

        const solution = this.currentExercise.practiceItem.conjugation.getConjugation(word)
        if (!solution) {
            // TODO: Raise error
            return;
        }
        this.solution = solution
        this.isAnswerCorrect = this.givenAnswer === this.solution.furigana

        // this.nextExercise();
    }

    finishCurrentExercise() {
        this.nextExercise()
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
}
