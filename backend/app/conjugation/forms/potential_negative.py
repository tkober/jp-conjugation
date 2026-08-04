from ..core import Conjugation, Word, WordType
from .non_past_short_negative import NonPastShortNegative
from .potential_affirmative import PotentialAffirmative


class PotentialNegative(Conjugation):

    title = 'Potential, negative'
    settings_title = 'Negative'

    def conjugate(self, word: Word) -> Word | None:
        original_type = word.word_type
        potential = PotentialAffirmative().conjugate(word)
        if potential is None:
            return None

        negative = NonPastShortNegative().conjugate(
            potential.change_type(WordType.ICHIDAN_VERB)
        )
        if negative is None:
            return None

        return negative.change_type(original_type)
