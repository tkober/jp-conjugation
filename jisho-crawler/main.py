import json
import argparse


from jisho.api import ApiClient, JlptLevel

def parse_args():
    argparser = argparse.ArgumentParser(
        prog='jisho-crawler',
        description='Crawls the Japanese language dictionary jisho.org for verbs and adjectives and stores these in '
                    'a JSON file.'
    )

    argparser.add_argument(
        '--out',
        help="Destination of the JSON file",
        metavar='OUT',
        required=True
    )

    return argparser.parse_args()

def optimize_json(words: dict) -> dict:
    result = {
        'ichidan_verb': [],
        'godan_verb': [],
        'suru_verb': [],
        'kuru_verb': [],
        'i_adjective': [],
        'na_adjective': [],
    }
    for level in words.keys():
        result['ichidan_verb'].extend([optimize_word(w) for w in words[level] if w['ichidan_verb']])
        result['godan_verb'].extend([optimize_word(w) for w in words[level] if w['godan_verb']])
        result['suru_verb'].extend([add_suffix(optimize_word(w), 'する') for w in words[level] if w['suru_verb']])
        result['kuru_verb'].extend([optimize_word(w) for w in words[level] if w['kuru_verb']])
        result['i_adjective'].extend([optimize_word(w) for w in words[level] if w['i_adjective']])
        result['na_adjective'].extend([optimize_word(w) for w in words[level] if w['na_adjective']])

    return result


def optimize_word(word) -> dict:
    return {
        'kanji': word['slug'],
        'furigana': word['furigana'],
        'english': word['english'],
        'jlpt': word['jlpt']
    }

def add_suffix(word, suffix) -> dict:
    return {
        'kanji': word['kanji'] + suffix,
        'furigana': word['furigana'] + suffix,
        'english': word['english'],
        'jlpt': word['jlpt']
    }


if __name__ == '__main__':
    args = parse_args()

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
    jisho_ts = 'export const jisho = ' + json_object
    with open(args.out, 'w', encoding='utf-8') as outfile:
        outfile.write(jisho_ts)
