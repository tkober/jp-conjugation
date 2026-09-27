from ..core import Conjugation, Word, WordType
from ..instruction import Category, Polarity
from .causative_affirmative import CausativeAffirmative
from .passive_negative import PassiveNegative


class CausativePassiveNegative(Conjugation):

    title = 'Causative-passive, negative'
    settings_title = 'Negative'
    category = Category.CAUSATIVE_PASSIVE
    polarity = Polarity.NEGATIVE

    def conjugate(self, word: Word) -> Word | None:
        original_type = word.word_type
        causative = CausativeAffirmative().conjugate(word)
        if causative is None:
            return None

        passive = PassiveNegative().conjugate(
            causative.change_type(WordType.GODAN_VERB)
        )
        if passive is None:
            return None

        return passive.change_type(original_type)
