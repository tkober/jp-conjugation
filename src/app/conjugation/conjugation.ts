export enum WordType {
    IchidanVerb = 'ichidan_verb',
    GodanVerb = 'godan_verb',
    SuruVerb = 'suru_verb',
    KuruVerb = 'kuru_verb',
    IAdjective = 'i_adjective',
    NaAdjective = 'na_adjective'
}

export class Word {
    public kanji: string;
    public furigana: string;
    public wordType: WordType;

    constructor(kanji: string, furigana: string, wordType: WordType) {
        this.kanji = kanji
        this.furigana = furigana
        this.wordType = wordType;
    }
}
export interface Conjugation {

    getConjugation(word: Word): (Word | undefined)

}
