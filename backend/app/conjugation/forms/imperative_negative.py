from ..core import Conjugation, Word, WordType


class ImperativeNegative(Conjugation):

    title = 'Imperative, negative'
    settings_title = 'Negative'

    def conjugate(self, word: Word) -> Word | None:
        match word.word_type:

            # Verbs
            case (
                WordType.GODAN_VERB
                | WordType.ICHIDAN_VERB
                | WordType.SURU_VERB
                | WordType.KURU_VERB
            ):
                return word.add_suffix('な')

            case _:
                return None
