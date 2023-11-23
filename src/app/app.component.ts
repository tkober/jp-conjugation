import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import * as wanakana from 'wanakana';
import {FormControl, FormGroup, Validators} from "@angular/forms";


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

    ngOnInit() {

    }

    ngAfterViewInit(): void {
        wanakana.bind(this.answerInput.nativeElement)
    }

    checkAnswer() {
        console.log('checkAnswer()')
        console.log(wanakana.toHiragana(this.answerFormControl.value))
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
}
