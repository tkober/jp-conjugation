import {Component, OnInit} from '@angular/core';
import * as jisho from './jisho.json'


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    title = 'jp-conjugation';

    ngOnInit() {
        console.log(jisho)
    }
}
