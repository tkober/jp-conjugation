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
