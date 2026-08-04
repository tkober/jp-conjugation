from ..core import Conjugation, Word, WordType
from .causative_affirmative import CausativeAffirmative
from .passive_negative import PassiveNegative


class CausativePassiveNegative(Conjugation):

    title = 'Causative-Passive, negative'
    settings_title = 'Negative'

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
