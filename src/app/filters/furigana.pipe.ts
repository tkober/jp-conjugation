import {Pipe, PipeTransform} from '@angular/core';
import {Vocabulary} from "../services/practice.service";
import * as wanakana from 'wanakana';
import {Word} from "../conjugation/conjugation";

@Pipe({
    name: 'furigana'
})
export class FuriganaPipe implements PipeTransform {

    transform(vocabulary: Vocabulary | Word): string {
        let kanji = vocabulary.kanji
        let hiragana = wanakana.toHiragana(vocabulary.furigana)

        for (let i = kanji.length; i > 0; i--) {
            if (kanji.slice(-1) === hiragana.slice(-1)) {
                kanji = kanji.slice(0, -1);
                hiragana = hiragana.slice(0, -1);
            } else {
                break;
            }
        }
        return hiragana;
    }

}
