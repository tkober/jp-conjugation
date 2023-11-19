export class HiraganaGroup {
    public a: string;
    public i: string;
    public u: string;
    public e: string;
    public o: string;

    constructor(a: string, i: string, u: string, e: string, o: string) {
        this.a = a;
        this.i = i;
        this.u = u;
        this.e = e;
        this.o = o;
    }
}

export const HIRAGANA_GROUPS: { [consonant: string]: HiraganaGroup } = {
    '-': {a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お'},
    k: {a: 'か', i: 'き', u: 'く', e: 'け', o: 'こ'},
    s: {a: 'さ', i: 'し', u: 'す', e: 'せ', o: 'そ'},
    t: {a: 'た', i: 'ち', u: 'つ', e: 'て', o: 'と'},
    n: {a: 'な', i: 'に', u: 'ぬ', e: 'ね', o: 'の'},
    h: {a: 'は', i: 'ひ', u: 'ふ', e: 'へ', o: 'ほ'},
    m: {a: 'ま', i: 'み', u: 'む', e: 'め', o: 'も'},
    r: {a: 'ら', i: 'り', u: 'る', e: 'れ', o: 'ろ'},
    g: {a: 'が', i: 'ぎ', u: 'ぐ', e: 'げ', o: 'ご'},
    z: {a: 'ざ', i: 'じ', u: 'ず', e: 'ぜ', o: 'ぞ'},
    d: {a: 'だ', i: 'ぢ', u: 'づ', e: 'で', o: 'ど'},
    b: {a: 'ば', i: 'び', u: 'ぶ', e: 'べ', o: 'ぼ'},
    p: {a: 'ぱ', i: 'ぴ', u: 'ぷ', e: 'ぺ', o: 'ぽ'}
};

export class Hiragana {
    public kana: string;
    public romanji: string;
    public group: string;

    constructor(literal: { kana: string, romanji: string, group: string }) {
        this.kana = literal.kana;
        this.romanji = literal.romanji;
        this.group = literal.group;
    }

    getGroup(): HiraganaGroup {
        return HIRAGANA_GROUPS[this.group];
    }
}

export const HIRAGANA: { [kana: string]: Hiragana } = {
    'あ': new Hiragana({kana: 'あ', romanji: 'a', group: '-'}),
    'い': new Hiragana({kana: 'い', romanji: 'i', group: '-'}),
    'う': new Hiragana({kana: 'う', romanji: 'u', group: '-'}),
    'え': new Hiragana({kana: 'え', romanji: 'e', group: '-'}),
    'お': new Hiragana({kana: 'お', romanji: 'o', group: '-'}),
    'か': new Hiragana({kana: 'か', romanji: 'ka', group: 'k'}),
    'き': new Hiragana({kana: 'き', romanji: 'ki', group: 'k'}),
    'く': new Hiragana({kana: 'く', romanji: 'ku', group: 'k'}),
    'け': new Hiragana({kana: 'け', romanji: 'ke', group: 'k'}),
    'こ': new Hiragana({kana: 'こ', romanji: 'ko', group: 'k'}),
    'さ': new Hiragana({kana: 'さ', romanji: 'sa', group: 's'}),
    'し': new Hiragana({kana: 'し', romanji: 'shi', group: 's'}),
    'す': new Hiragana({kana: 'す', romanji: 'su', group: 's'}),
    'せ': new Hiragana({kana: 'せ', romanji: 'se', group: 's'}),
    'そ': new Hiragana({kana: 'そ', romanji: 'so', group: 's'}),
    'た': new Hiragana({kana: 'た', romanji: 'ta', group: 't'}),
    'ち': new Hiragana({kana: 'ち', romanji: 'chi', group: 't'}),
    'つ': new Hiragana({kana: 'つ', romanji: 'tsu', group: 't'}),
    'て': new Hiragana({kana: 'て', romanji: 'te', group: 't'}),
    'と': new Hiragana({kana: 'と', romanji: 'to', group: 't'}),
    'な': new Hiragana({kana: 'な', romanji: 'na', group: 'n'}),
    'に': new Hiragana({kana: 'に', romanji: 'ni', group: 'n'}),
    'ぬ': new Hiragana({kana: 'ぬ', romanji: 'nu', group: 'n'}),
    'ね': new Hiragana({kana: 'ね', romanji: 'ne', group: 'n'}),
    'の': new Hiragana({kana: 'の', romanji: 'no', group: 'n'}),
    'は': new Hiragana({kana: 'は', romanji: 'ha', group: 'h'}),
    'ひ': new Hiragana({kana: 'ひ', romanji: 'hi', group: 'h'}),
    'ふ': new Hiragana({kana: 'ふ', romanji: 'fu', group: 'h'}),
    'へ': new Hiragana({kana: 'へ', romanji: 'he', group: 'h'}),
    'ほ': new Hiragana({kana: 'ほ', romanji: 'ho', group: 'h'}),
    'ま': new Hiragana({kana: 'ま', romanji: 'ma', group: 'm'}),
    'み': new Hiragana({kana: 'み', romanji: 'mi', group: 'm'}),
    'む': new Hiragana({kana: 'む', romanji: 'mu', group: 'm'}),
    'め': new Hiragana({kana: 'め', romanji: 'me', group: 'm'}),
    'も': new Hiragana({kana: 'も', romanji: 'mo', group: 'm'}),
    'や': new Hiragana({kana: 'や', romanji: 'ya', group: 'y'}),
    'ゆ': new Hiragana({kana: 'ゆ', romanji: 'yu', group: 'y'}),
    'よ': new Hiragana({kana: 'よ', romanji: 'yo', group: 'y'}),
    'ら': new Hiragana({kana: 'ら', romanji: 'ra', group: 'r'}),
    'り': new Hiragana({kana: 'り', romanji: 'ri', group: 'r'}),
    'る': new Hiragana({kana: 'る', romanji: 'ru', group: 'r'}),
    'れ': new Hiragana({kana: 'れ', romanji: 're', group: 'r'}),
    'ろ': new Hiragana({kana: 'ろ', romanji: 'ro', group: 'r'}),
    'わ': new Hiragana({kana: 'わ', romanji: 'wa', group: 'w'}),
    'を': new Hiragana({kana: 'を', romanji: 'wo', group: 'w'}),
    'ん': new Hiragana({kana: 'ん', romanji: 'n', group: 'nn'}),
    'が': new Hiragana({kana: 'が', romanji: 'ga', group: 'g'}),
    'ぎ': new Hiragana({kana: 'ぎ', romanji: 'gi', group: 'g'}),
    'ぐ': new Hiragana({kana: 'ぐ', romanji: 'gu', group: 'g'}),
    'げ': new Hiragana({kana: 'げ', romanji: 'ge', group: 'g'}),
    'ご': new Hiragana({kana: 'ご', romanji: 'go', group: 'g'}),
    'ざ': new Hiragana({kana: 'ざ', romanji: 'za', group: 'z'}),
    'じ': new Hiragana({kana: 'じ', romanji: 'ji', group: 'z'}),
    'ず': new Hiragana({kana: 'ず', romanji: 'zu', group: 'z'}),
    'ぜ': new Hiragana({kana: 'ぜ', romanji: 'ze', group: 'z'}),
    'ぞ': new Hiragana({kana: 'ぞ', romanji: 'zo', group: 'z'}),
    'だ': new Hiragana({kana: 'だ', romanji: 'da', group: 'd'}),
    'ぢ': new Hiragana({kana: 'ぢ', romanji: 'ji', group: 'd'}),
    'づ': new Hiragana({kana: 'づ', romanji: 'zu', group: 'd'}),
    'で': new Hiragana({kana: 'で', romanji: 'de', group: 'd'}),
    'ど': new Hiragana({kana: 'ど', romanji: 'do', group: 'd'}),
    'ば': new Hiragana({kana: 'ば', romanji: 'ba', group: 'b'}),
    'び': new Hiragana({kana: 'び', romanji: 'bi', group: 'b'}),
    'ぶ': new Hiragana({kana: 'ぶ', romanji: 'bu', group: 'b'}),
    'べ': new Hiragana({kana: 'べ', romanji: 'be', group: 'b'}),
    'ぼ': new Hiragana({kana: 'ぼ', romanji: 'bo', group: 'b'}),
    'ぱ': new Hiragana({kana: 'ぱ', romanji: 'pa', group: 'p'}),
    'ぴ': new Hiragana({kana: 'ぴ', romanji: 'pi', group: 'p'}),
    'ぷ': new Hiragana({kana: 'ぷ', romanji: 'pu', group: 'p'}),
    'ぺ': new Hiragana({kana: 'ぺ', romanji: 'pe', group: 'p'}),
    'ぽ': new Hiragana({kana: 'ぽ', romanji: 'po', group: 'p'}),

    // Digraphs
    'きゃ': new Hiragana({kana: 'きゃ', romanji: 'kya', group: 'k'}),
    'きゅ': new Hiragana({kana: 'きゅ', romanji: 'kyu', group: 'k'}),
    'きょ': new Hiragana({kana: 'きょ', romanji: 'kyo', group: 'k'}),
    'しゃ': new Hiragana({kana: 'しゃ', romanji: 'sha', group: 's'}),
    'しゅ': new Hiragana({kana: 'しゅ', romanji: 'shu', group: 's'}),
    'しょ': new Hiragana({kana: 'しょ', romanji: 'sho', group: 's'}),
    'ちゃ': new Hiragana({kana: 'ちゃ', romanji: 'cha', group: 't'}),
    'ちゅ': new Hiragana({kana: 'ちゅ', romanji: 'chu', group: 't'}),
    'ちょ': new Hiragana({kana: 'ちょ', romanji: 'cho', group: 't'}),
    'にゃ': new Hiragana({kana: 'にゃ', romanji: 'nya', group: 'n'}),
    'にゅ': new Hiragana({kana: 'にゅ', romanji: 'nyu', group: 'n'}),
    'にょ': new Hiragana({kana: 'にょ', romanji: 'nyo', group: 'n'}),
    'ひゃ': new Hiragana({kana: 'ひゃ', romanji: 'hya', group: 'h'}),
    'ひゅ': new Hiragana({kana: 'ひゅ', romanji: 'hyu', group: 'h'}),
    'ひょ': new Hiragana({kana: 'ひょ', romanji: 'hyo', group: 'h'}),
    'みゃ': new Hiragana({kana: 'みゃ', romanji: 'mya', group: 'm'}),
    'みゅ': new Hiragana({kana: 'みゅ', romanji: 'myu', group: 'm'}),
    'みょ': new Hiragana({kana: 'みょ', romanji: 'myo', group: 'm'}),
    'りゃ': new Hiragana({kana: 'りゃ', romanji: 'rya', group: 'r'}),
    'りゅ': new Hiragana({kana: 'りゅ', romanji: 'ryu', group: 'r'}),
    'りょ': new Hiragana({kana: 'りょ', romanji: 'ryo', group: 'r'}),
    'ぎゃ': new Hiragana({kana: 'ぎゃ', romanji: 'gya', group: 'g'}),
    'ぎゅ': new Hiragana({kana: 'ぎゅ', romanji: 'gyu', group: 'g'}),
    'ぎょ': new Hiragana({kana: 'ぎょ', romanji: 'gyo', group: 'g'}),
    'じゃ': new Hiragana({kana: 'じゃ', romanji: 'ja', group: 'j'}),
    'じゅ': new Hiragana({kana: 'じゅ', romanji: 'ju', group: 'j'}),
    'じょ': new Hiragana({kana: 'じょ', romanji: 'jo', group: 'j'}),
    'びゃ': new Hiragana({kana: 'びゃ', romanji: 'bya', group: 'b'}),
    'びゅ': new Hiragana({kana: 'びゅ', romanji: 'byu', group: 'b'}),
    'びょ': new Hiragana({kana: 'びょ', romanji: 'byo', group: 'b'}),
    'ぴゃ': new Hiragana({kana: 'ぴゃ', romanji: 'pya', group: 'p'}),
    'ぴゅ': new Hiragana({kana: 'ぴゅ', romanji: 'pyu', group: 'p'}),
    'ぴょ': new Hiragana({kana: 'ぴょ', romanji: 'pyo', group: 'p'}),
};
