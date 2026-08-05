from ..core import Conjugation, Word, WordType
from ..hiragana import HIRAGANA


class PotentialAffirmative(Conjugation):

    title = 'Potential, affirmative'
    settings_title = 'Affirmative'

    def conjugate(self, word: Word) -> Word | None:
        match word.word_type:

            # Verbs
            case WordType.GODAN_VERB:
                last_kana = HIRAGANA[word.last_kana]

                return word.replace_last_kana(last_kana.group.e + 'る')

            case WordType.ICHIDAN_VERB:
                return word.replace_last_kana('られる')

            case WordType.SURU_VERB:
                return word.replace_last_kana('ができる', 2)

            case WordType.KURU_VERB:
                return word.replace('来られる', 'こられる')

            case _:
                return None
