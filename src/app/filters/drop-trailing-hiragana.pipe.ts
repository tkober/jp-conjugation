import {Pipe, PipeTransform} from '@angular/core';
import {Vocabulary} from "../services/practice.service";
import * as wanakana from 'wanakana';
import {Word} from "../conjugation/conjugation";

@Pipe({
    name: 'dropTrailingHiragana'
})
export class DropTrailingHiraganaPipe implements PipeTransform {

    transform(vocabulary: Vocabulary | Word): string {
        // @ts-ignore
        const tokens: Array<{
            type: string;
            value: string;
        }> = wanakana.tokenize(vocabulary.kanji, {compact: false, detailed: true})
        return tokens
            .filter(value => {
                return value.type !== 'hiragana'
            })
            .map(value => value.value)
            .join('')
    }

}
