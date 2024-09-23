export abstract class PersistentService {

    protected loadFromLocalStorage(key: string, fallback: any): any {
        const stored = localStorage.getItem(key)
        if (stored) {
            return JSON.parse(stored)
        }
        return fallback
    }
}
