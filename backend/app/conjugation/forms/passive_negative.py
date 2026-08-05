from ..core import Conjugation, Word, WordType
from .non_past_short_negative import NonPastShortNegative
from .passive_affirmative import PassiveAffirmative


class PassiveNegative(Conjugation):

    title = 'Passive, negative'
    settings_title = 'Negative'

    def conjugate(self, word: Word) -> Word | None:
        original_type = word.word_type
        passive = PassiveAffirmative().conjugate(word)
        if passive is None:
            return None

        negative = NonPastShortNegative().conjugate(
            passive.change_type(WordType.ICHIDAN_VERB)
        )
        if negative is None:
            return None

        return negative.change_type(original_type)
