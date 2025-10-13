// Global Recording API singleton
class RecordingAPI {
  private startFn: (() => void) | null = null;
  private stopFn: (() => void) | null = null;
  private abortFn: (() => void) | null = null;

  // Called by RecordingProvider to register the functions
  register(start: () => void, stop: () => void, abort: () => void) {

    this.startFn = start;
    this.stopFn = stop;
    this.abortFn = abort;
  }

  start() {
    console.log('📞 Recording.start() called');
    if (this.startFn) {

      this.startFn();
    } else {
      console.warn('❌ Recording API not initialized - ensure RecordingProvider is mounted');
    }
  }

  stop() {
    console.log('📞 Recording.stop() called');
    if (this.stopFn) {
      console.log('✅ Calling registered stop function');
      this.stopFn();
    } else {
      console.warn('❌ Recording API not initialized - ensure RecordingProvider is mounted');
    }
  }

  abort() {
    if (this.abortFn) {
      this.abortFn();
    } else {
      console.warn('Recording API not initialized - ensure RecordingProvider is mounted');
    }
  }
}

export const Recording = new RecordingAPI();