from ..core import Conjugation, Word, WordType
from ..instruction import Politeness, Polarity, Tense
from .non_past_short_negative import NonPastShortNegative


class PastShortNegative(Conjugation):

    title = 'Past, casual, negative'
    settings_title = 'Casual, negative'
    tense = Tense.PAST
    politeness = Politeness.CASUAL
    polarity = Polarity.NEGATIVE

    def conjugate(self, word: Word) -> Word | None:
        match word.word_type:

            # Verbs
            case (
                WordType.GODAN_VERB
                | WordType.ICHIDAN_VERB
                | WordType.SURU_VERB
                | WordType.KURU_VERB
            ):
                negative = NonPastShortNegative().conjugate(word)
                if negative is None:
                    return None

                return negative.replace_last_kana('かった')

            # Adjectives
            case WordType.I_ADJECTIVE:
                return word.replace_last_kana('くなかった')

            case WordType.NA_ADJECTIVE:
                return word.add_suffix('じゃなかった')

            case _:
                return None
