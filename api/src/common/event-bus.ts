import { EventEmitter } from 'events';

export type EventTap = (name: string, payload: any) => void;

/**
 * EventEmitter with a lightweight tap mechanism for cross-cutting concerns
 * (audit, metrics, tracing). Taps fire BEFORE the event is dispatched to
 * regular listeners, so side-effects are deterministic and cannot be skipped
 * by a listener that throws.
 *
 * Why taps instead of just more listeners: a regular `on('*', ...)` doesn't
 * exist in Node's EventEmitter, and registering on every event name by hand
 * is fragile (you forget the new event when you add a module). Taps observe
 * every emit without needing to know the event names upfront.
 */
class TappableEventEmitter extends EventEmitter {
  private taps: EventTap[] = [];

  addTap(tap: EventTap): void {
    this.taps.push(tap);
  }

  emit(eventName: string | symbol, ...args: any[]): boolean {
    const name = String(eventName);
    for (const tap of this.taps) {
      try {
        tap(name, args[0]);
      } catch (err) {
        // A misbehaving tap must not break the dispatch chain.
        console.error(`[event-bus] tap error on ${name}:`, err);
      }
    }
    return super.emit(eventName, ...args);
  }
}

const eventBus = new TappableEventEmitter();
eventBus.setMaxListeners(50);

export default eventBus;
