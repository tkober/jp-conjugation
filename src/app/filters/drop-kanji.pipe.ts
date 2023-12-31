import {Pipe, PipeTransform} from '@angular/core';
import {Vocabulary} from "../services/practice.service";
import * as wanakana from "wanakana";
import {Word} from "../conjugation/conjugation";

@Pipe({
    name: 'dropKanji'
})
export class DropKanjiPipe implements PipeTransform {

    transform(vocabulary: Vocabulary | Word): string {
        const tokens = wanakana.tokenize(vocabulary.kanji);
        const lastToken = tokens[tokens.length-1]

        if (typeof lastToken === 'string' && wanakana.isHiragana(lastToken)) {
            return lastToken
        }

        return ''
    }

}
