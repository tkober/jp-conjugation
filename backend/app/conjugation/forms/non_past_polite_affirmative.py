from ..core import Conjugation, Word, WordType
from ..instruction import Politeness, Polarity, Tense
from ..hiragana import HIRAGANA


class NonPastPoliteAffirmative(Conjugation):

    title = 'Present, polite, positive'
    settings_title = 'Polite, positive'
    tense = Tense.NON_PAST
    politeness = Politeness.POLITE
    polarity = Polarity.AFFIRMATIVE

    def conjugate(self, word: Word) -> Word | None:
        match word.word_type:

            # Verbs
            case WordType.GODAN_VERB:
                last_kana = HIRAGANA[word.last_kana]
                return word.replace_last_kana(last_kana.group.i + 'ます')

            case WordType.ICHIDAN_VERB:
                return word.replace_last_kana('ます')

            case WordType.SURU_VERB:
                return word.replace_last_kana('します', 2)

            case WordType.KURU_VERB:
                return word.replace('来ます', 'きます')

            # Adjectives
            case WordType.I_ADJECTIVE:
                if word.kanji == '良い':
                    return word.replace('良いです', 'いいです')

                return word.add_suffix('です')

            case WordType.NA_ADJECTIVE:
                return word.add_suffix('です')

            case _:
                return None
