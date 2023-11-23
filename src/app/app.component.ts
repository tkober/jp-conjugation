import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import * as wanakana from 'wanakana';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
    title = 'jp-conjugation';

    @ViewChild('answerInput') answerInput: ElementRef;

    ngOnInit() {
    }

    ngAfterViewInit(): void {
        wanakana.bind(this.answerInput.nativeElement)
    }
}
