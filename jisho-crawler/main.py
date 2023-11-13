import json

from jisho.api import ApiClient, JlptLevel


def optimize_json(words: dict) -> dict:
    result = {}
    for key in words.keys():
        result[key] = {
            'ichidan_verb': [optimize_word(w) for w in words[key] if w['ichidan_verb']],
            'godan_verb': [optimize_word(w) for w in words[key] if w['godan_verb']],
            'suru_verb': [optimize_word(w) for w in words[key] if w['suru_verb']],
            'kuru_verb': [optimize_word(w) for w in words[key] if w['kuru_verb']],
            'i_adjective': [optimize_word(w) for w in words[key] if w['i_adjective']],
            'na_adjective': [optimize_word(w) for w in words[key] if w['na_adjective']]
        }

    return result


def optimize_word(word) -> dict:
    return {
        'kanji': word['slug'],
        'furigana': word['furigana'],
        'english': word['english']
    }


if __name__ == '__main__':

    result = {}
    levels = [
        JlptLevel.N5,
        JlptLevel.N4,
        JlptLevel.N3,
        JlptLevel.N2,
        JlptLevel.N1
    ]

    api = ApiClient()
    for level in levels:
        level_readable = level.value[6:]
        words = []
        print(f'+ {level_readable.upper()}')

        print(f'+- Verbs')
        verbs = api.get_verbs(level)
        print(f'|')

        print(f'+- I-Adjectives')
        i_adjectives = api.get_i_adjectives(level)
        print(f'|')

        print(f'+- Na-Adjectives')
        na_adjectives = api.get_na_adjectives(level)
        print(f'|')

        print(
            f'+- Added {len(verbs) + len(i_adjectives) + len(na_adjectives)} ({len(verbs)} Verbs, {len(i_adjectives)} I-Adjectives, {len(na_adjectives)} Na-Adjectives)')
        print(f'|')
        print(f'|')
        words.extend(verbs)
        words.extend(i_adjectives)
        words.extend(na_adjectives)

        result[level_readable] = words

    optimized = optimize_json(result)
    json_object = json.dumps(optimized, indent=4, ensure_ascii=False)
    with open('dictionary.json', 'w', encoding='utf-8') as outfile:
        outfile.write(json_object)
