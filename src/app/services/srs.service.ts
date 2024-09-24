import {Injectable} from "@angular/core";
import {PersistentService} from "./persistent-service";
import {AdjectiveForms, AllForms, VerbForms, WordType} from "../conjugation/conjugation";

class SrsItem {
    public key: string;
    public lastReview: (Date | null) = null;
    public lastSuccess: (Date | null) = null;
    public lastFailure: (Date | null) = null;
    public currentStreak: number = 0;
    public successCount: number = 0;
    public failureCount: number = 0;

    constructor(key: string) {
        this.key = key;
    }

    public deepCopy(): SrsItem {
        return JSON.parse(JSON.stringify(this)) as SrsItem;
    }

    public static fromJson(json: any): SrsItem {
        const item = new SrsItem(json.key);
        item.lastReview = json.lastReview ? new Date(json.lastReview) : null;
        item.lastSuccess = json.lastSuccess ? new Date(json.lastSuccess) : null;
        item.lastFailure = json.lastFailure ? new Date(json.lastFailure) : null;
        item.currentStreak = json.currentStreak || 0;
        item.successCount = json.successCount || 0;
        item.failureCount = json.failureCount || 0;
        return item;
    }
}

class SrsState {
    public version: string;
    public items: Map<string, SrsItem>;

    constructor(version: string, items: Map<string, SrsItem>) {
        this.version = version;
        this.items = items;
    }
}

export const LocalStorageKey_SrsState__Items = 'SRS_STATE_ITEMS'

export const LocalStorageKey_SrState__Version = 'SRS_STATE_VERSION'

export const SRS_CURRENT_VERSION: string = '1.0';

@Injectable({
    providedIn: 'root'
})
export class SrsService extends PersistentService {

    private state: SrsState;
    private validItemKeys: string[];

    constructor() {
        super();
        this.initialize()
    }

    public initialize() {
        this.validItemKeys = this.composeValidItemKeys();

        // Load validated state
        this.loadState()

        // Save validated state to persist migrations and fixes
        this.saveState()
    }

    private composeValidItemKeys(): string[] {
        const result: string[] = []

        // Adjective Practice Items
        for (let formKey in AdjectiveForms) {
            for (let wordType of [WordType.IAdjective, WordType.NaAdjective]) {
                result.push(`${AdjectiveForms[formKey].constructor.name}__${wordType}`)
            }
        }

        // Verbs Practice Items
        for (let formKey in VerbForms) {
            for (let wordType of [WordType.IchidanVerb, WordType.GodanVerb, WordType.SuruVerb, WordType.KuruVerb]) {
                result.push(`${VerbForms[formKey].constructor.name}__${wordType}`)
            }
        }

        return result;
    }

    private loadState() {
        const savedItems = this.loadFromLocalStorage(LocalStorageKey_SrsState__Items, {})
        const savedVersion = this.loadFromLocalStorage(LocalStorageKey_SrState__Version, '')

        if (savedVersion !== '' && savedVersion !== SRS_CURRENT_VERSION) {
            console.warn(`Found SRS data for version ${savedVersion}. Current version is ${SRS_CURRENT_VERSION}. Attempting migration`);
            // TODO: Migration if necessary
        }

        // Sort out states that are not valid
        const validatedItems: Map<string, SrsItem> = new Map<string, SrsItem>();
        for (const key in savedItems) {
            if (this.validItemKeys.indexOf(key) !== -1) {
                validatedItems.set(key, SrsItem.fromJson(savedItems[key]));
            } else {
                console.warn(`Invalid key '${key}' found in saved SRS items. Will be ignored.`)
            }
        }

        // Add missing Items
        for (const key of this.validItemKeys) {
            if (!validatedItems.has(key)) {
                validatedItems.set(key, new SrsItem(key))
            }
        }

        // Create State
        this.state = new SrsState(SRS_CURRENT_VERSION, validatedItems)
    }

    private saveState() {
        localStorage.setItem(LocalStorageKey_SrState__Version, JSON.stringify(this.state.version))
        localStorage.setItem(LocalStorageKey_SrsState__Items, JSON.stringify(Object.fromEntries(this.state.items.entries())))
    }

    public stateForForm(form: string): (SrsItem | undefined) {
        return this.state.items.get(form)?.deepCopy();
    }
}
