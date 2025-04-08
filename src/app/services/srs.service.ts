import {Injectable} from "@angular/core";
import {LocalStorageKey_SrsState__Items, LocalStorageKey_SrState__Version, PersistentService} from "./persistent-service";
import {AdjectiveForms, AllForms, composeAdjectiveSrsKey, composeVerbsSrsKey, VerbForms, WordType} from "../conjugation/conjugation";

export class SrsItem {
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
        return SrsItem.fromJson(JSON.parse(JSON.stringify(this)))
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

    public success(timestamp: Date) {
        this.lastReview = timestamp;
        this.lastSuccess = timestamp;
        this.currentStreak = Math.max(this.currentStreak+1, 1)
        this.successCount++;
    }

    public fail(timestamp: Date) {
        this.lastReview = timestamp;
        this.lastFailure = timestamp;
        this.currentStreak = Math.min(this.currentStreak-1, -1)
        this.failureCount++;
    }

    public getScore(): number {
        const streakWeight = -5;          // Positive streak lowers priority, negative increases it
        const failRatioWeight = 3;        // High failure rate increases priority
        const recentnessWeight = 1;       // The longer ago, the higher the priority (slightly)
        const noiseFactor = 0.1;          // Random offset to avoid strict repetition

        // 1. Streak score
        const streakScore = streakWeight * this.currentStreak;

        // 2. Failure ratio score
        const totalAttempts = this.successCount + this.failureCount;
        const failRatio = totalAttempts > 0 ? this.failureCount / totalAttempts : 0;
        const failRatioScore = failRatioWeight * failRatio;

        // 3. Time since last review
        const now = Date.now();
        const lastReview = this.lastReview?.getTime() ?? 0;
        const minutesSinceReview = (now - lastReview) / (60 * 1000);
        const recentnessScore = recentnessWeight * Math.log1p(minutesSinceReview); // log1p(x) = log(1 + x)

        // 4. Small random noise to break ties
        const randomNoise = Math.random() * noiseFactor;

        return streakScore + failRatioScore - recentnessScore + randomNoise;
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
                result.push(composeAdjectiveSrsKey(formKey, wordType))
            }
        }

        // Verbs Practice Items
        for (let formKey in VerbForms) {
            for (let wordType of [WordType.IchidanVerb, WordType.GodanVerb, WordType.SuruVerb, WordType.KuruVerb]) {
                result.push(composeVerbsSrsKey(formKey, wordType))
            }
        }

        return result;
    }

    private loadState() {
        const savedItems = this.loadFromStorage(LocalStorageKey_SrsState__Items, {})
        const savedVersion = this.loadFromStorage(LocalStorageKey_SrState__Version, '')

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
        this.saveToStorage(LocalStorageKey_SrState__Version, this.state.version)
        this.saveToStorage(LocalStorageKey_SrsState__Items, Object.fromEntries(this.state.items.entries()))
    }

    public stateForForm(form: string): (SrsItem) {
        if (this.state.items.has(form)) {
            return this.state.items.get(form)!.deepCopy();
        }
        
        return new SrsItem(form);
    }

    public updateStateForForm(form: string, item: SrsItem) {
        this.state.items.set(form, item);
        this.saveState();
    }

    public getItemQueue(formsToConsider: string[], queueSize: number): SrsItem[] {
        const sortedItems = Array.from(this.state.items.values())
        .filter((item) => formsToConsider.indexOf(item.key) !== -1)
        .sort((a, b) => a.getScore() - b.getScore());
    
        return sortedItems.slice(0, queueSize);
    }
}
