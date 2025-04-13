import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatInputModule} from "@angular/material/input";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import { FuriganaPipe } from './filters/furigana.pipe';
import { DropTrailingHiraganaPipe } from './filters/drop-trailing-hiragana.pipe';
import { DropKanjiPipe } from './filters/drop-kanji.pipe';
import {MatCardModule} from "@angular/material/card";
import {A11yModule} from "@angular/cdk/a11y";
import { SettingsDialogComponent } from './settings-dialog/settings-dialog.component';
import {MatDialogModule} from "@angular/material/dialog";
import {MatTabsModule} from "@angular/material/tabs";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";
import { SrsDialogComponent } from './srs-dialog/srs-dialog.component';
import { WordtypeReadablePipe } from './wordtype-readable.pipe';

@NgModule({
  declarations: [
    AppComponent,
    FuriganaPipe,
    DropTrailingHiraganaPipe,
    DropKanjiPipe,
    SettingsDialogComponent,
    SrsDialogComponent,
    WordtypeReadablePipe
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
        A11yModule,
        MatDialogModule,
        MatTabsModule,
        MatExpansionModule,
        MatSidenavModule,
        MatSlideToggleModule
    ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
