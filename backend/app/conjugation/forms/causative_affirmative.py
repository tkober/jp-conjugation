from ..core import Conjugation, Word, WordType
from ..hiragana import HIRAGANA


class CausativeAffirmative(Conjugation):

    title = 'Causative, affirmative'
    settings_title = 'Affirmative'

    def conjugate(self, word: Word) -> Word | None:
        match word.word_type:

            # Verbs
            case WordType.GODAN_VERB:
                last_kana = HIRAGANA[word.last_kana]
                if last_kana.kana == 'う':
                    return word.replace_last_kana('わせる')

                return word.replace_last_kana(last_kana.group.a + 'せる')

            case WordType.ICHIDAN_VERB:
                return word.replace_last_kana('させる')

            case WordType.SURU_VERB:
                return word.replace_last_kana('させる', 2)

            case WordType.KURU_VERB:
                return word.replace('来させる', 'こさせる')

            case _:
                return None
