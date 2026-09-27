"""The instruction dimensions, independent of the DB.

Two things matter for the chips to be trustworthy: every form's dimension
combination is internally consistent (polarity always set, category XOR
tense+politeness), and every combination is unique within its word class — two
forms sharing a fingerprint would render identical instructions.
"""

from app.conjugation import (
    ADJECTIVE_FORMS,
    DEFAULT_INSTRUCTION_ORDER,
    TENSE_FIRST_ORDER,
    VERB_FORMS,
    instruction_parts,
    is_valid_order,
)
from app.conjugation.instruction import VALUES, Dimension


def _fingerprint(form):
    return (form.category, form.tense, form.politeness, form.polarity)


def test_every_form_sets_polarity_and_either_category_or_tense_and_politeness():
    for form in {**ADJECTIVE_FORMS, **VERB_FORMS}.values():
        assert form.polarity is not None

        has_category = form.category is not None
        has_tense_and_politeness = form.tense is not None and form.politeness is not None
        assert has_category != has_tense_and_politeness  # XOR
        if has_category:
            assert form.tense is None
            assert form.politeness is None
        else:
            assert form.tense is not None
            assert form.politeness is not None


def test_dimension_fingerprints_are_unique_per_word_class():
    for forms in (ADJECTIVE_FORMS, VERB_FORMS):
        fingerprints = [_fingerprint(f) for f in forms.values()]
        assert len(fingerprints) == len(set(fingerprints))


def test_every_used_value_has_a_catalog_entry_with_label_and_emoji_only_off_category():
    for forms in (ADJECTIVE_FORMS, VERB_FORMS):
        for form in forms.values():
            for dim, value in (
                (Dimension.CATEGORY, form.category),
                (Dimension.TENSE, form.tense),
                (Dimension.POLITENESS, form.politeness),
                (Dimension.POLARITY, form.polarity),
            ):
                if value is None:
                    continue
                info = VALUES[dim][value]
                assert info.label
                # Categories are grammar, not a switch: text only (issue #3).
                assert (info.emoji is None) == (dim == Dimension.CATEGORY)


def test_labels_are_unique_per_dimension():
    for dim, values in VALUES.items():
        labels = [info.label for info in values.values()]
        assert len(labels) == len(set(labels)), dim


def test_past_polite_negative_in_default_and_tense_first_order():
    form = VERB_FORMS['Verbs__PastPoliteNegative']

    default = instruction_parts(form, DEFAULT_INSTRUCTION_ORDER)
    assert [p['value'] for p in default] == ['polite', 'negative', 'past']

    tense_first = instruction_parts(form, TENSE_FIRST_ORDER)
    assert [p['value'] for p in tense_first] == ['past', 'polite', 'negative']


def test_causative_passive_negative_omits_tense_and_politeness():
    form = VERB_FORMS['Verbs__CausativePassiveNegative']

    parts = instruction_parts(form, DEFAULT_INSTRUCTION_ORDER)
    assert [p['dimension'] for p in parts] == ['category', 'polarity']
    assert parts[0]['emoji'] is None


def test_is_valid_order_accepts_the_two_presets():
    assert is_valid_order(DEFAULT_INSTRUCTION_ORDER)
    assert is_valid_order(TENSE_FIRST_ORDER)
    assert is_valid_order(list(DEFAULT_INSTRUCTION_ORDER))


def test_is_valid_order_rejects_broken_orders():
    assert not is_valid_order(['category', 'category', 'tense', 'polarity'])  # duplicate
    assert not is_valid_order(['category', 'tense', 'polarity'])  # missing
    assert not is_valid_order(['category', 'tense', 'polarity', 'nonsense'])  # unknown
    assert not is_valid_order([])  # empty
    assert not is_valid_order('category')
