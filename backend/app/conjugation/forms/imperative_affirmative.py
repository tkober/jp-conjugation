from ..core import Conjugation, Word, WordType
from ..hiragana import HIRAGANA


class ImperativeAffirmative(Conjugation):

    title = 'Imperative, affirmative'
    settings_title = 'Affirmative'

    def conjugate(self, word: Word) -> Word | None:
        match word.word_type:

            # Verbs
            case WordType.GODAN_VERB:
                last_kana = HIRAGANA[word.last_kana]
                return word.replace_last_kana(last_kana.group.e)

            case WordType.ICHIDAN_VERB:
                # Exception: 呉れる
                if word.kanji == '呉れる':
                    return word.replace('呉れ', 'くれ')

                return word.replace_last_kana('ろ')

            case WordType.SURU_VERB:
                return word.replace_last_kana('しろ', 2)

            case WordType.KURU_VERB:
                return word.replace('来い', 'こい')

            case _:
                return None
