from ..core import Conjugation, Word, WordType
from ..instruction import Politeness, Polarity, Tense
from ..hiragana import HIRAGANA


class NonPastShortNegative(Conjugation):

    title = 'Present, casual, negative'
    settings_title = 'Casual, negative'
    tense = Tense.NON_PAST
    politeness = Politeness.CASUAL
    polarity = Polarity.NEGATIVE

    def conjugate(self, word: Word) -> Word | None:
        match word.word_type:

            # Verbs
            case WordType.GODAN_VERB:
                last_kana = HIRAGANA[word.last_kana]
                if last_kana.kana == 'う':
                    return word.replace_last_kana('わない')

                return word.replace_last_kana(last_kana.group.a + 'ない')

            case WordType.ICHIDAN_VERB:
                return word.replace_last_kana('ない')

            case WordType.SURU_VERB:
                return word.replace_last_kana('しない', 2)

            case WordType.KURU_VERB:
                return word.replace('来ない', 'こない')

            # Adjectives
            case WordType.I_ADJECTIVE:
                return word.replace_last_kana('くない')

            case WordType.NA_ADJECTIVE:
                return word.add_suffix('じゃない')

            case _:
                return None
