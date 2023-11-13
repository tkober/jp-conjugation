import urllib.parse
import requests
import json
from enum import Enum


class WordType(Enum):
    Verbs = '#verb'
    AdjectivesI = '#adj-i'
    AdjectivesNa = '#adj-na'


class JlptLevel(Enum):
    N1 = '#jlpt-n1'
    N2 = '#jlpt-n2'
    N3 = '#jlpt-n3'
    N4 = '#jlpt-n4'
    N5 = '#jlpt-n5'


class ApiClient:

    def __init__(self):
        self.__base_url = 'http://beta.jisho.org/api/v1/search/words?'

    def get_verbs(self, level: JlptLevel):
        return self.__get_words(level, WordType.Verbs)

    def get_i_adjectives(self, level: JlptLevel):
        return self.__get_words(level, WordType.AdjectivesI)

    def get_na_adjectives(self, level: JlptLevel):
        return self.__get_words(level, WordType.AdjectivesNa)

    def __get_words(self, level: JlptLevel, type: WordType):
        page = 1
        data = None

        result = []
        while data is None or len(data) > 0:
            url = self.__build_url(type, level, page)
            # print(url)
            response = requests.get(url)
            content = json.loads(response.text)

            if response.status_code != 200:
                print(f'ERROR: {response} for {url}')
                return

            data = content['data']
            print(f'+-- Found {len(data)} items on page {page}')

            words = self.__word_dicts_from_data(data, level, type)
            result.extend(words)
            page += 1

        return result

    def __build_url(self, type: WordType, level: JlptLevel, page: int = 1) -> str:
        params = {
            'keyword': f'{type.value} {level.value}',
            'page': page
        }
        return self.__base_url + urllib.parse.urlencode(params)

    def __word_dicts_from_data(self, data, level: JlptLevel, type: WordType):
        return [
            {
                'slug': item['slug'],
                'furigana': item['japanese'][0]['reading'],
                'type': type.value,
                'jlpt': level.value[6:],
                'english': '; '.join(item['senses'][0]['english_definitions']),
                'ichidan_verb': self.__is_ichidan_verb(item['senses'][0]['parts_of_speech']),
                'godan_verb': self.__is_godan_verb(item['senses'][0]['parts_of_speech']),
                'suru_verb': self.__is_suru_verb(item['senses'][0]['parts_of_speech']),
                'kuru_verb': self.__is_kuru_verb(item['senses'][0]['parts_of_speech']),
                'i_adjective': self.__is_i_adjective_verb(item['senses'][0]['parts_of_speech']),
                'na_adjective': self.__is_na_adjective_verb(item['senses'][0]['parts_of_speech']),

            }
            for item in data
            if len(item['jlpt']) > 0 and len(item['japanese']) > 0 and len(item['senses']) > 0
        ]

    def __is_ichidan_verb(self, pos: [str]) -> bool:
        return 'Ichidan Verb'.lower() in ';'.join(pos).lower()

    def __is_godan_verb(self, pos: [str]) -> bool:
        return 'Godan Verb'.lower() in ';'.join(pos).lower()

    def __is_suru_verb(self, pos: [str]) -> bool:
        return 'Suru Verb'.lower() in ';'.join(pos).lower()

    def __is_kuru_verb(self, pos: [str]) -> bool:
        return 'Kuru Verb'.lower() in ';'.join(pos).lower()

    def __is_i_adjective_verb(self, pos: [str]) -> bool:
        return 'I-adjective'.lower() in ';'.join(pos).lower()

    def __is_na_adjective_verb(self, pos: [str]) -> bool:
        return 'Na-adjective'.lower() in ';'.join(pos).lower()
