/**
 * Simple event bus for scene enter/leave events
 */

type SceneEvent = 'scene:enter' | 'scene:leave";
type ScrollDirection = 'forward' | 'backward";
type SceneEventListener = (sceneId: string, direction?: ScrollDirection) => void;

class SceneBus {
  private listeners: Map<SceneEvent, Set<SceneEventListener>> = new Map();

  on(event: SceneEvent, listener: SceneEventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: SceneEvent, listener: SceneEventListener) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  emit(event: SceneEvent, sceneId: string, direction?: ScrollDirection) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(sceneId, direction));
    }
  }

  clear() {
    this.listeners.clear();
  }
}

// Global singleton instance
const globalSceneBus = new SceneBus();

// Export scene bus reference for direct use
export { globalSceneBus as sceneBus };