const HIRAGANA: { [kana: string]: { romanji: string; group: string } } = {
    'あ': { romanji: 'a', group: '-' }, 'い': { romanji: 'i', group: '-' }, 'う': { romanji: 'u', group: '-' }, 'え': { romanji: 'e', group: '-' }, 'お': { romanji: 'o', group: '-' },
    'か': { romanji: 'ka', group: 'k' }, 'き': { romanji: 'ki', group: 'k' }, 'く': { romanji: 'ku', group: 'k' }, 'け': { romanji: 'ke', group: 'k' }, 'こ': { romanji: 'ko', group: 'k' },
    'さ': { romanji: 'sa', group: 's' }, 'し': { romanji: 'shi', group: 's' }, 'す': { romanji: 'su', group: 's' }, 'せ': { romanji: 'se', group: 's' }, 'そ': { romanji: 'so', group: 's' },
    'た': { romanji: 'ta', group: 't' }, 'ち': { romanji: 'chi', group: 't' }, 'つ': { romanji: 'tsu', group: 't' }, 'て': { romanji: 'te', group: 't' }, 'と': { romanji: 'to', group: 't' },
    'な': { romanji: 'na', group: 'n' }, 'に': { romanji: 'ni', group: 'n' }, 'ぬ': { romanji: 'nu', group: 'n' }, 'ね': { romanji: 'ne', group: 'n' }, 'の': { romanji: 'no', group: 'n' },
    'は': { romanji: 'ha', group: 'h' }, 'ひ': { romanji: 'hi', group: 'h' }, 'ふ': { romanji: 'fu', group: 'h' }, 'へ': { romanji: 'he', group: 'h' }, 'ほ': { romanji: 'ho', group: 'h' },
    'ま': { romanji: 'ma', group: 'm' }, 'み': { romanji: 'mi', group: 'm' }, 'む': { romanji: 'mu', group: 'm' }, 'め': { romanji: 'me', group: 'm' }, 'も': { romanji: 'mo', group: 'm' },
    'や': { romanji: 'ya', group: 'y' }, 'ゆ': { romanji: 'yu', group: 'y' }, 'よ': { romanji: 'yo', group: 'y' },
    'ら': { romanji: 'ra', group: 'r' }, 'り': { romanji: 'ri', group: 'r' }, 'る': { romanji: 'ru', group: 'r' }, 'れ': { romanji: 're', group: 'r' }, 'ろ': { romanji: 'ro', group: 'r' },
    'わ': { romanji: 'wa', group: 'w' }, 'を': { romanji: 'wo', group: 'w' },
    'ん': { romanji: 'n', group: 'nn' },
    'が': { romanji: 'ga', group: 'g' }, 'ぎ': { romanji: 'gi', group: 'g' }, 'ぐ': { romanji: 'gu', group: 'g' }, 'げ': { romanji: 'ge', group: 'g' }, 'ご': { romanji: 'go', group: 'g' },
    'ざ': { romanji: 'za', group: 'z' }, 'じ': { romanji: 'ji', group: 'z' }, 'ず': { romanji: 'zu', group: 'z' }, 'ぜ': { romanji: 'ze', group: 'z' }, 'ぞ': { romanji: 'zo', group: 'z' },
    'だ': { romanji: 'da', group: 'd' }, 'ぢ': { romanji: 'ji', group: 'd' }, 'づ': { romanji: 'zu', group: 'd' }, 'で': { romanji: 'de', group: 'd' }, 'ど': { romanji: 'do', group: 'd' },
    'ば': { romanji: 'ba', group: 'b' }, 'び': { romanji: 'bi', group: 'b' }, 'ぶ': { romanji: 'bu', group: 'b' }, 'べ': { romanji: 'be', group: 'b' }, 'ぼ': { romanji: 'bo', group: 'b' },
    'ぱ': { romanji: 'pa', group: 'p' }, 'ぴ': { romanji: 'pi', group: 'p' }, 'ぷ': { romanji: 'pu', group: 'p' }, 'ぺ': { romanji: 'pe', group: 'p' }, 'ぽ': { romanji: 'po', group: 'p' },

    // Add the missing digraphs with single quotes
    'きゃ': { romanji: 'kya', group: 'k' }, 'きゅ': { romanji: 'kyu', group: 'k' }, 'きょ': { romanji: 'kyo', group: 'k' },
    'しゃ': { romanji: 'sha', group: 's' }, 'しゅ': { romanji: 'shu', group: 's' }, 'しょ': { romanji: 'sho', group: 's' },
    'ちゃ': { romanji: 'cha', group: 't' }, 'ちゅ': { romanji: 'chu', group: 't' }, 'ちょ': { romanji: 'cho', group: 't' },
    'にゃ': { romanji: 'nya', group: 'n' }, 'にゅ': { romanji: 'nyu', group: 'n' }, 'にょ': { romanji: 'nyo', group: 'n' },
    'ひゃ': { romanji: 'hya', group: 'h' }, 'ひゅ': { romanji: 'hyu', group: 'h' }, 'ひょ': { romanji: 'hyo', group: 'h' },
    'みゃ': { romanji: 'mya', group: 'm' }, 'みゅ': { romanji: 'myu', group: 'm' }, 'みょ': { romanji: 'myo', group: 'm' },
    'りゃ': { romanji: 'rya', group: 'r' }, 'りゅ': { romanji: 'ryu', group: 'r' }, 'りょ': { romanji: 'ryo', group: 'r' },
    'ぎゃ': { romanji: 'gya', group: 'g' }, 'ぎゅ': { romanji: 'gyu', group: 'g' }, 'ぎょ': { romanji: 'gyo', group: 'g' },
    'じゃ': { romanji: 'ja', group: 'j' }, 'じゅ': { romanji: 'ju', group: 'j' }, 'じょ': { romanji: 'jo', group: 'j' },
    'びゃ': { romanji: 'bya', group: 'b' }, 'びゅ': { romanji: 'byu', group: 'b' }, 'びょ': { romanji: 'byo', group: 'b' },
    'ぴゃ': { romanji: 'pya', group: 'p' }, 'ぴゅ': { romanji: 'pyu', group: 'p' }, 'ぴょ': { romanji: 'pyo', group: 'p' },
};




const HIRAGANA_GROUPS = {
    '-': { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' },
    k: { a: 'か', i: 'き', u: 'く', e: 'け', o: 'こ' },
    s: { a: 'さ', i: 'し', u: 'す', e: 'せ', o: 'そ' },
    t: { a: 'た', i: 'ち', u: 'つ', e: 'て', o: 'と' },
    n: { a: 'な', i: 'に', u: 'ぬ', e: 'ね', o: 'の' },
    h: { a: 'は', i: 'ひ', u: 'ふ', e: 'へ', o: 'ほ' },
    m: { a: 'ま', i: 'み', u: 'む', e: 'め', o: 'も' },
    y: { a: 'や', u: 'ゆ', o: 'よ' },
    r: { a: 'ら', i: 'り', u: 'る', e: 'れ', o: 'ろ' },
    w: { a: 'わ', o: 'を' },
    nn: { a: 'ん' },
    g: { a: 'が', i: 'ぎ', u: 'ぐ', e: 'げ', o: 'ご' },
    z: { a: 'ざ', i: 'じ', u: 'ず', e: 'ぜ', o: 'ぞ' },
    d: { a: 'だ', i: 'ぢ', u: 'づ', e: 'で', o: 'ど' },
    b: { a: 'ば', i: 'び', u: 'ぶ', e: 'べ', o: 'ぼ' },
    p: { a: 'ぱ', i: 'ぴ', u: 'ぷ', e: 'ぺ', o: 'ぽ' }
};
