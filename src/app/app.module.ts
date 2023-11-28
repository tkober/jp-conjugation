import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatInputModule} from "@angular/material/input";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import { FuriganaPipe } from './filters/furigana.pipe';
import { DropKanaPipe } from './filters/drop-kana.pipe';
import { DropKanjiPipe } from './filters/drop-kanji.pipe';
import {MatCardModule} from "@angular/material/card";
import {A11yModule} from "@angular/cdk/a11y";

@NgModule({
  declarations: [
    AppComponent,
    FuriganaPipe,
    DropKanaPipe,
    DropKanjiPipe
  ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        MatInputModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        A11yModule
    ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
