import {Pipe, PipeTransform} from '@angular/core';
import {Vocabulary} from "../services/practice.service";
import * as wanakana from 'wanakana';

@Pipe({
    name: 'dropKana'
})
export class DropKanaPipe implements PipeTransform {

    transform(vocabulary: Vocabulary): string {
        const stripped = wanakana.tokenize(vocabulary.kanji)[0];
        if (typeof stripped === 'string') {

            if (wanakana.isKanji(stripped)) {
                return stripped
            }
            return ''
        }

        return vocabulary.kanji
    }

}
