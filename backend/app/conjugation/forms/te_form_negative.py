from ..core import Conjugation, Word
from .non_past_short_negative import NonPastShortNegative


class TeFormNegative(Conjugation):

    title = 'Te-Form, negative'
    settings_title = 'Negative'

    def conjugate(self, word: Word) -> Word | None:
        negative = NonPastShortNegative().conjugate(word)
        if negative is None:
            return None

        return negative.replace_last_kana('くて')
