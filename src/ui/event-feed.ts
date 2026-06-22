/**
 * Event Feed — Scrollable game event log
 *
 * Displays game events in natural language so the player always
 * knows what just happened. Events are added via addEvent() and
 * auto-scroll to the latest entry.
 */

export type EventType =
    | 'shadowking'   // Shadowking behavior card actions
    | 'vote'         // Voting phase results
    | 'action'       // Player actions (move, claim, recruit)
    | 'combat'       // Combat results
    | 'doom'         // Doom toll changes
    | 'broken'       // Broken court state changes
    | 'system';      // Phase transitions, round changes

interface FeedEvent {
    readonly round: number;
    readonly type: EventType;
    readonly message: string;
    readonly timestamp: number;
}

const EVENT_ICONS: Record<EventType, string> = {
    shadowking: '☠',
    vote: '⚖',
    action: '⚑',
    combat: '⚔',
    doom: '🔔',
    broken: '💔',
    system: '▸',
};

const EVENT_COLORS: Record<EventType, string> = {
    shadowking: '#a78bfa',
    vote: '#60a5fa',
    action: '#34d399',
    combat: '#f87171',
    doom: '#fbbf24',
    broken: '#fb923c',
    system: '#94a3b8',
};

export class EventFeed {
    private container: HTMLElement;
    private feedList: HTMLElement;
    private events: FeedEvent[] = [];
    private maxEvents = 50;

    constructor(parentId: string | HTMLElement) {
        const parent = typeof parentId === 'string'
            ? document.getElementById(parentId)
            : parentId;
        if (!parent) throw new Error('Event feed parent not found');

        this.container = document.createElement('div');
        this.container.className = 'event-feed';
        this.container.innerHTML = `
            <div class="event-feed-header">
                <span class="event-feed-title">⚐ Event Log</span>
            </div>
            <div class="event-feed-list"></div>
        `;
        parent.appendChild(this.container);

        this.feedList = this.container.querySelector('.event-feed-list')!;
    }

    /**
     * Add an event to the feed. Auto-scrolls to bottom.
     */
    public addEvent(round: number, type: EventType, message: string): void {
        const event: FeedEvent = {
            round,
            type,
            message,
            timestamp: Date.now(),
        };

        this.events.push(event);
        if (this.events.length > this.maxEvents) {
            this.events.shift();
        }

        this.renderEvent(event);
        this.feedList.scrollTop = this.feedList.scrollHeight;
    }

    /**
     * Add a round separator to visually group events by round.
     */
    public addRoundSeparator(round: number): void {
        const sep = document.createElement('div');
        sep.className = 'event-feed-round-sep';
        sep.textContent = `— Round ${round} —`;
        this.feedList.appendChild(sep);
        this.feedList.scrollTop = this.feedList.scrollHeight;
    }

    /**
     * Clear all events (e.g., on new game).
     */
    public clear(): void {
        this.events = [];
        this.feedList.innerHTML = '';
    }

    private renderEvent(event: FeedEvent): void {
        const el = document.createElement('div');
        el.className = `event-feed-item event-${event.type}`;

        const icon = EVENT_ICONS[event.type] ?? '▸';
        const color = EVENT_COLORS[event.type] ?? '#94a3b8';

        el.innerHTML = `
            <span class="event-icon" style="color: ${color}">${icon}</span>
            <span class="event-message">${event.message}</span>
        `;

        // Fade-in animation
        el.style.opacity = '0';
        el.style.transform = 'translateX(-10px)';
        this.feedList.appendChild(el);

        requestAnimationFrame(() => {
            el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            el.style.opacity = '1';
            el.style.transform = 'translateX(0)';
        });
    }
}
