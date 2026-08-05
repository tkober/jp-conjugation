"""Routes through the TestClient, which runs the lifespan (schema + seeding)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(db_schema):
    with TestClient(app) as c:
        yield c


def solve(client) -> dict:
    """Fetch an exercise and answer it correctly, using the engine as oracle."""
    from app.conjugation import WordType
    from app.practice import conjugate

    exercise = client.get('/api/exercise/next').json()
    expected = conjugate(
        WordType(exercise['word_type']),
        exercise['kanji'],
        exercise['hiragana'],
        exercise['form_key'],
    )
    response = client.post('/api/answer', json={
        'practice_item_id': exercise['practice_item_id'],
        'word_id': exercise['word_id'],
        'answer': expected.hiragana,
        'time_ms': 800,
    })
    assert response.status_code == 200
    return response.json()


def test_health(client) -> None:
    assert client.get('/api/health').json() == {'status': 'ok'}


def test_profile_starts_at_the_default_elo(client) -> None:
    body = client.get('/api/profile').json()

    assert body['elo'] == 1000.0
    assert body['current_streak'] == 0
    assert 1 <= body['level'] <= 20


def test_next_exercise_does_not_leak_the_answer(client) -> None:
    body = client.get('/api/exercise/next').json()

    assert {'practice_item_id', 'word_id', 'form_title', 'kanji', 'hiragana'} <= body.keys()
    assert body['target_time_ms'] > 0
    serialized = str(body)
    assert 'expected' not in serialized
    assert 'solution' not in serialized


def test_answering_correctly(client) -> None:
    body = solve(client)

    assert body['correct']
    assert body['streak'] == 1
    assert body['elo']['delta'] > 0
    assert body['transformations']
    assert body['expected_hiragana']


def test_answering_wrongly(client) -> None:
    exercise = client.get('/api/exercise/next').json()
    body = client.post('/api/answer', json={
        'practice_item_id': exercise['practice_item_id'],
        'word_id': exercise['word_id'],
        'answer': 'ぬぬぬ',
        'time_ms': 800,
    }).json()

    assert not body['correct']
    assert body['streak'] == 0
    assert body['elo']['delta'] < 0


def test_answer_for_an_unknown_exercise_is_404(client) -> None:
    response = client.post('/api/answer', json={
        'practice_item_id': 999_999, 'word_id': 999_999, 'answer': 'x', 'time_ms': 1,
    })

    assert response.status_code == 404


def test_stats_after_a_few_answers(client) -> None:
    for _ in range(3):
        solve(client)

    body = client.get('/api/stats').json()

    assert body['attempts'] == 3
    assert body['correct'] == 3
    assert body['accuracy'] == 1.0
    assert len(body['elo_history']) == 3
    assert len(body['items']) == 256
    assert len(body['recent']) == 3
    assert body['avg_time_ms'] == 800


def test_settings_roundtrip(client) -> None:
    body = client.get('/api/settings').json()
    assert body['disabled_forms'] == []
    assert [g['title'] for g in body['groups']][:2] == ['Non-past', 'Past']

    updated = client.put('/api/settings', json={
        'disabled_jlpt': ['n1', 'n2'],
        'time_base_ms': 4000,
    }).json()

    assert updated['disabled_jlpt'] == ['n1', 'n2']
    assert updated['time_base_ms'] == 4000
    assert client.get('/api/settings').json()['time_base_ms'] == 4000


def test_settings_reject_disabling_everything(client) -> None:
    body = client.get('/api/settings').json()
    every_form = [f['form_key'] for g in body['groups'] for f in g['forms']]

    response = client.put('/api/settings', json={'disabled_forms': every_form})

    assert response.status_code == 400


def test_settings_reject_unknown_keys(client) -> None:
    assert client.put('/api/settings', json={'disabled_forms': ['Nope']}).status_code == 400
    assert client.put('/api/settings', json={'disabled_jlpt': ['n9']}).status_code == 400


def test_time_budget_is_clamped(client) -> None:
    body = client.put('/api/settings', json={'time_base_ms': 10_000_000}).json()

    assert body['time_base_ms'] == body['limits']['time_base_ms'][1]


def test_settings_carry_worked_examples_of_the_time_budget(client) -> None:
    """The UI shows the budget for real answer lengths without knowing the formula."""
    body = client.put(
        '/api/settings', json={'time_base_ms': 2000, 'time_per_kana_ms': 500}
    ).json()

    assert [e['kana'] for e in body['examples']] == [3, 6, 10]
    assert [e['budget_ms'] for e in body['examples']] == [3500, 5000, 7000]


def test_words_can_be_filtered_and_paged(client) -> None:
    body = client.get('/api/words', params={'word_type': 'godan_verb', 'limit': 5}).json()

    assert body['total'] > 500
    assert len(body['words']) == 5
    assert {w['word_type'] for w in body['words']} == {'godan_verb'}

    search = client.get('/api/words', params={'q': 'およぐ'}).json()
    assert search['total'] >= 1
    assert any(w['hiragana'] == 'およぐ' for w in search['words'])


def test_reset_needs_the_confirmation(client) -> None:
    solve(client)

    assert client.post('/api/reset', json={'confirm': 'nope'}).status_code == 400
    assert client.post('/api/reset', json={'confirm': 'RESET'}).status_code == 200

    body = client.get('/api/stats').json()
    assert body['attempts'] == 0
    assert body['elo'] == 1000.0
