export const LocalStorageKey_SrsState__Items = 'SRS_STATE_ITEMS'
export const LocalStorageKey_SrState__Version = 'SRS_STATE_VERSION'

export const LocalStorageKey_ExcludedConjugations = 'EXCLUDED_CONJUGATIONS'
export const LocalStorageKey_ExcludedJpltLevels = 'EXCLUDED_JLPT_LEVELS'

export abstract class PersistentService {

    protected loadFromStorage(key: string, fallback: any): any {
        const stored = localStorage.getItem(key)
        if (stored) {
            return JSON.parse(stored)
        }
        return fallback
    }

    protected saveToStorage(key: string, item: any) {
        localStorage.setItem(key, JSON.stringify(item))
    }

    protected removeFromStorage(key: string) {
        localStorage.removeItem(key)
    }
}
