from ..core import Conjugation, Word
from ..instruction import Category, Polarity
from .non_past_short_negative import NonPastShortNegative


class TeFormNegative(Conjugation):

    title = 'Te-form, negative'
    settings_title = 'Negative'
    category = Category.TE_FORM
    polarity = Polarity.NEGATIVE

    def conjugate(self, word: Word) -> Word | None:
        negative = NonPastShortNegative().conjugate(word)
        if negative is None:
            return None

        return negative.replace_last_kana('くて')
