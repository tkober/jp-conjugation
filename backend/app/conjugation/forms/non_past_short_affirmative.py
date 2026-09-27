from ..core import Conjugation, Word, WordType
from ..instruction import Politeness, Polarity, Tense


class NonPastShortAffirmative(Conjugation):

    title = 'Present, casual, positive'
    settings_title = 'Casual, positive'
    tense = Tense.NON_PAST
    politeness = Politeness.CASUAL
    polarity = Polarity.AFFIRMATIVE

    def conjugate(self, word: Word) -> Word | None:
        match word.word_type:

            # Verbs
            case (
                WordType.GODAN_VERB
                | WordType.ICHIDAN_VERB
                | WordType.SURU_VERB
                | WordType.KURU_VERB
            ):
                return word

            # Adjectives
            case WordType.I_ADJECTIVE:
                if word.kanji == '良い':
                    return word.replace(word.kanji, 'いい')

                return word

            case WordType.NA_ADJECTIVE:
                return word

            case _:
                return None
