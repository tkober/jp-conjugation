from ..core import Conjugation, Word, WordType
from .causative_affirmative import CausativeAffirmative
from .passive_affirmative import PassiveAffirmative


class CausativePassiveAffirmative(Conjugation):

    title = 'Causative-Passive, affirmative'
    settings_title = 'Affirmative'

    def conjugate(self, word: Word) -> Word | None:
        original_type = word.word_type
        causative = CausativeAffirmative().conjugate(word)
        if causative is None:
            return None

        passive = PassiveAffirmative().conjugate(
            causative.change_type(WordType.GODAN_VERB)
        )
        if passive is None:
            return None

        return passive.change_type(original_type)
