import { Pipe, PipeTransform } from '@angular/core';
import { WordType } from './conjugation/conjugation';

@Pipe({
  name: 'wordtypeReadable'
})
export class WordtypeReadablePipe implements PipeTransform {

  transform(value: WordType, ...args: unknown[]): string {
    switch (value) {
      
      case WordType.IAdjective:
      return 'い-Adjective';

      case WordType.NaAdjective:
      return 'な-Adjective';

      case WordType.IchidanVerb:
      return 'Ichidan-Verb';

      case WordType.GodanVerb:
      return 'Godan-Verb';

      case WordType.KuruVerb:
      return 'くる-Verb';

      case WordType.SuruVerb:
      return 'する-Verb';

      default:
      return '';
    }
  }

}
