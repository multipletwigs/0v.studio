type EventCallback = (data?: string | { cellIdentifier?: string; pageId?: string }) => void;

class EventEmitter {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.push(callback);
    }
  }

  off(event: string, callback: EventCallback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, data?: string | { cellIdentifier?: string; pageId?: string }) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        callback(data);
      });
    }
  }
}

export const eventEmitter = new EventEmitter();

