from ..core import Conjugation, Word, WordType
from ..instruction import Politeness, Polarity, Tense
from .te_form_affirmative import TeFormAffirmative


class PastShortAffirmative(Conjugation):

    title = 'Past, casual, positive'
    settings_title = 'Casual, positive'
    tense = Tense.PAST
    politeness = Politeness.CASUAL
    polarity = Polarity.AFFIRMATIVE

    def conjugate(self, word: Word) -> Word | None:
        match word.word_type:

            # Verbs
            case (
                WordType.GODAN_VERB
                | WordType.ICHIDAN_VERB
                | WordType.SURU_VERB
                | WordType.KURU_VERB
            ):
                te_form = TeFormAffirmative().conjugate(word)
                if te_form is None:
                    return None

                if te_form.last_kana == 'で':
                    return te_form.replace_last_kana('だ')
                else:
                    return te_form.replace_last_kana('た')

            # Adjectives
            case WordType.I_ADJECTIVE:
                return word.replace_last_kana('かった')

            case WordType.NA_ADJECTIVE:
                return word.add_suffix('だった')

            case _:
                return None
