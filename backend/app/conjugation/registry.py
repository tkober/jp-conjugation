"""The conjugation forms, grouped the way the settings dialog presents them.

The dict keys are the stable form keys used by the settings and the SRS; they
are the class names prefixed with the group they belong to, because the same
class serves both adjectives and verbs (a te-form of an adjective is not the
same practice item as a te-form of a verb).
"""

from .core import Conjugation, WordType
from .forms.causative_affirmative import CausativeAffirmative
from .forms.causative_negative import CausativeNegative
from .forms.causative_passive_affirmative import CausativePassiveAffirmative
from .forms.causative_passive_negative import CausativePassiveNegative
from .forms.imperative_affirmative import ImperativeAffirmative
from .forms.imperative_negative import ImperativeNegative
from .forms.non_past_polite_affirmative import NonPastPoliteAffirmative
from .forms.non_past_polite_negative import NonPastPoliteNegative
from .forms.non_past_short_affirmative import NonPastShortAffirmative
from .forms.non_past_short_negative import NonPastShortNegative
from .forms.passive_affirmative import PassiveAffirmative
from .forms.passive_negative import PassiveNegative
from .forms.past_polite_affirmative import PastPoliteAffirmative
from .forms.past_polite_negative import PastPoliteNegative
from .forms.past_short_affirmative import PastShortAffirmative
from .forms.past_short_negative import PastShortNegative
from .forms.potential_affirmative import PotentialAffirmative
from .forms.potential_negative import PotentialNegative
from .forms.te_form_affirmative import TeFormAffirmative
from .forms.te_form_negative import TeFormNegative

ADJECTIVES__NON_PAST_FORMS: dict[str, Conjugation] = {
    'Adjectives__NonPastShortAffirmative': NonPastShortAffirmative(),
    'Adjectives__NonPastShortNegative': NonPastShortNegative(),
    'Adjectives__NonPastPoliteAffirmative': NonPastPoliteAffirmative(),
    'Adjectives__NonPastPoliteNegative': NonPastPoliteNegative(),
}

ADJECTIVES__PAST_FORMS: dict[str, Conjugation] = {
    'Adjectives__PastShortAffirmative': PastShortAffirmative(),
    'Adjectives__PastShortNegative': PastShortNegative(),
    'Adjectives__PastPoliteAffirmative': PastPoliteAffirmative(),
    'Adjectives__PastPoliteNegative': PastPoliteNegative(),
}

# Affirmative before negative, like every other group — the TypeScript original
# had the polite pair the other way round, which only ever showed up as a stray
# ordering in the settings list. The keys are untouched, so no stored setting
# and no practice item is affected.
VERBS__NON_PAST_FORMS: dict[str, Conjugation] = {
    'Verbs__NonPastShortAffirmative': NonPastShortAffirmative(),
    'Verbs__NonPastShortNegative': NonPastShortNegative(),
    'Verbs__NonPastPoliteAffirmative': NonPastPoliteAffirmative(),
    'Verbs__NonPastPoliteNegative': NonPastPoliteNegative(),
}

VERBS__PAST_FORMS: dict[str, Conjugation] = {
    'Verbs__PastShortAffirmative': PastShortAffirmative(),
    'Verbs__PastShortNegative': PastShortNegative(),
    'Verbs__PastPoliteAffirmative': PastPoliteAffirmative(),
    'Verbs__PastPoliteNegative': PastPoliteNegative(),
}

VERBS__TE_FORM_FORMS: dict[str, Conjugation] = {
    'Verbs__TeFormAffirmative': TeFormAffirmative(),
    'Verbs__TeFormNegative': TeFormNegative(),
}

VERBS__POTENTIAL_FORMS: dict[str, Conjugation] = {
    'Verbs__PotentialAffirmative': PotentialAffirmative(),
    'Verbs__PotentialNegative': PotentialNegative(),
}

VERBS__PASSIVE_FORMS: dict[str, Conjugation] = {
    'Verbs__PassiveAffirmative': PassiveAffirmative(),
    'Verbs__PassiveNegative': PassiveNegative(),
}

VERBS__CAUSATIVE_FORMS: dict[str, Conjugation] = {
    'Verbs__CausativeAffirmative': CausativeAffirmative(),
    'Verbs__CausativeNegative': CausativeNegative(),
}

VERBS__CAUSATIVE_PASSIVE_FORMS: dict[str, Conjugation] = {
    'Verbs__CausativePassiveAffirmative': CausativePassiveAffirmative(),
    'Verbs__CausativePassiveNegative': CausativePassiveNegative(),
}

VERBS__IMPERATIVE_FORMS: dict[str, Conjugation] = {
    'Verbs__ImperativeAffirmative': ImperativeAffirmative(),
    'Verbs__ImperativeNegative': ImperativeNegative(),
}

ADJECTIVE_FORMS: dict[str, Conjugation] = {
    **ADJECTIVES__NON_PAST_FORMS,
    **ADJECTIVES__PAST_FORMS,
}

VERB_FORMS: dict[str, Conjugation] = {
    **VERBS__NON_PAST_FORMS,
    **VERBS__PAST_FORMS,
    **VERBS__TE_FORM_FORMS,
    **VERBS__POTENTIAL_FORMS,
    **VERBS__PASSIVE_FORMS,
    **VERBS__CAUSATIVE_FORMS,
    **VERBS__CAUSATIVE_PASSIVE_FORMS,
    **VERBS__IMPERATIVE_FORMS,
}

ALL_FORMS: dict[str, Conjugation] = {
    **ADJECTIVE_FORMS,
    **VERB_FORMS,
}


#: The grouping the settings screen shows, in display order.
FORM_GROUPS: tuple[tuple[str, str, dict[str, Conjugation]], ...] = (
    ('Adjectives', 'Non-past', ADJECTIVES__NON_PAST_FORMS),
    ('Adjectives', 'Past', ADJECTIVES__PAST_FORMS),
    ('Verbs', 'Non-past', VERBS__NON_PAST_FORMS),
    ('Verbs', 'Past', VERBS__PAST_FORMS),
    ('Verbs', 'Te-Form', VERBS__TE_FORM_FORMS),
    ('Verbs', 'Potential', VERBS__POTENTIAL_FORMS),
    ('Verbs', 'Passive', VERBS__PASSIVE_FORMS),
    ('Verbs', 'Causative', VERBS__CAUSATIVE_FORMS),
    ('Verbs', 'Causative-Passive', VERBS__CAUSATIVE_PASSIVE_FORMS),
    ('Verbs', 'Imperative', VERBS__IMPERATIVE_FORMS),
)


def compose_adjective_srs_key(form_key: str, word_type: WordType) -> str:
    return f'Adjectives__{type(ADJECTIVE_FORMS[form_key]).__name__}__{word_type.value}'


def compose_verbs_srs_key(form_key: str, word_type: WordType) -> str:
    return f'Verbs__{type(VERB_FORMS[form_key]).__name__}__{word_type.value}'
