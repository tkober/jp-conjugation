import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import * as wanakana from 'wanakana';
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {Exercise, PracticeService, Vocabulary} from "./services/practice.service";


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

    constructor(private practiceService: PracticeService) {
    }

    ngOnInit() {
        this.nextExercise()
    }

    ngAfterViewInit(): void {
        wanakana.bind(this.answerInput.nativeElement)
    }

    checkAnswer() {
        const answer = wanakana.toHiragana(this.answerInput.nativeElement.value);

        this.nextExercise();
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
        this.currentExercise = this.practiceService.nextExercise();
    }
}
