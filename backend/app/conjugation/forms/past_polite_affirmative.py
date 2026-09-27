from ..core import Conjugation, Word, WordType
from ..instruction import Politeness, Polarity, Tense
from ..hiragana import HIRAGANA


class PastPoliteAffirmative(Conjugation):

    title = 'Past, polite, positive'
    settings_title = 'Polite, positive'
    tense = Tense.PAST
    politeness = Politeness.POLITE
    polarity = Polarity.AFFIRMATIVE

    def conjugate(self, word: Word) -> Word | None:
        match word.word_type:

            # Verbs
            case WordType.GODAN_VERB:
                last_kana = HIRAGANA[word.last_kana]
                return word.replace_last_kana(last_kana.group.i + 'ました')

            case WordType.ICHIDAN_VERB:
                return word.replace_last_kana('ました')

            case WordType.SURU_VERB:
                return word.replace_last_kana('しました', 2)

            case WordType.KURU_VERB:
                return word.replace('来ました', 'きました')

            # Adjectives
            case WordType.I_ADJECTIVE:
                return word.replace_last_kana('かったです')

            case WordType.NA_ADJECTIVE:
                return word.add_suffix('でした')

            case _:
                return None
