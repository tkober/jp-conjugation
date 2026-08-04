from ..core import Conjugation, Word, WordType
from .causative_affirmative import CausativeAffirmative
from .non_past_short_negative import NonPastShortNegative


class CausativeNegative(Conjugation):

    title = 'Causative, negative'
    settings_title = 'Negative'

    def conjugate(self, word: Word) -> Word | None:
        original_type = word.word_type
        causative = CausativeAffirmative().conjugate(word)
        if causative is None:
            return None

        negative = NonPastShortNegative().conjugate(
            causative.change_type(WordType.ICHIDAN_VERB)
        )
        if negative is None:
            return None

        return negative.change_type(original_type)
