from ..core import Conjugation, Word, WordType
from ..hiragana import HIRAGANA


class PastPoliteNegative(Conjugation):

    title = 'Past, polite, negative'
    settings_title = 'Polite, negative'

    def conjugate(self, word: Word) -> Word | None:
        match word.word_type:

            # Verbs
            case WordType.GODAN_VERB:
                last_kana = HIRAGANA[word.last_kana]
                return word.replace_last_kana(last_kana.group.i + 'ませんでした')

            case WordType.ICHIDAN_VERB:
                return word.replace_last_kana('ませんでした')

            case WordType.SURU_VERB:
                return word.replace_last_kana('しませんでした', 2)

            case WordType.KURU_VERB:
                return word.replace('来ませんでした', 'きませんでした')

            # Adjectives
            case WordType.I_ADJECTIVE:
                return word.replace_last_kana('くなかったです')

            case WordType.NA_ADJECTIVE:
                return word.add_suffix('じゃなかったです')

            case _:
                return None
