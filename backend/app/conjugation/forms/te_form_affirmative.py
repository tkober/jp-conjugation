from ..core import Conjugation, Word, WordType
from ..hiragana import HIRAGANA


class TeFormAffirmative(Conjugation):

    title = 'Te-Form, affirmative'
    settings_title = 'Affirmative'

    def conjugate(self, word: Word) -> Word | None:
        match word.word_type:

            # Verbs
            case WordType.GODAN_VERB:
                last_kana = HIRAGANA[word.last_kana]

                #　行く
                if word.kanji == '行く':
                    return word.replace('行って', 'いって')

                #　う、つ、る　ー＞　って
                if last_kana.kana in ('う', 'つ', 'る'):
                    return word.replace_last_kana('って')

                #　む、ぶ、ぬ　ー＞　んで
                if last_kana.kana in ('む', 'ぶ', 'ぬ'):
                    return word.replace_last_kana('んで')

                #　く　ー＞　いて
                if last_kana.kana == 'く':
                    return word.replace_last_kana('いて')

                #　ぐ　ー＞　いで
                if last_kana.kana == 'ぐ':
                    return word.replace_last_kana('いで')

                #　す　ー＞　して
                if last_kana.kana == 'す':
                    return word.replace_last_kana('して')

                return None

            case WordType.ICHIDAN_VERB:
                return word.replace_last_kana('て')

            case WordType.SURU_VERB:
                return word.replace_last_kana('して', 2)

            case WordType.KURU_VERB:
                return word.replace('来て', 'きて')

            case _:
                return None
