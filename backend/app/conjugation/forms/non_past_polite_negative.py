from ..core import Conjugation, Word, WordType
from ..hiragana import HIRAGANA


class NonPastPoliteNegative(Conjugation):

    title = 'Non-past, polite, negative'
    settings_title = 'Polite, negative'

    def conjugate(self, word: Word) -> Word | None:
        match word.word_type:

            # Verbs
            case WordType.GODAN_VERB:
                last_kana = HIRAGANA[word.last_kana]
                return word.replace_last_kana(last_kana.group.i + 'ません')

            case WordType.ICHIDAN_VERB:
                return word.replace_last_kana('ません')

            case WordType.SURU_VERB:
                return word.replace_last_kana('しません', 2)

            case WordType.KURU_VERB:
                return word.replace('来ません', 'きません')

            # Adjectives
            case WordType.I_ADJECTIVE:
                return word.replace_last_kana('くないです')

            case WordType.NA_ADJECTIVE:
                return word.add_suffix('じゃないです')

            case _:
                return None
