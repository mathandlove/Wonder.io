// Global Recording API singleton
class RecordingAPI {
  private startFn: (() => Promise<void>) | null = null;
  private stopFn: (() => void) | null = null;
  private abortFn: (() => void) | null = null;

  // Called by RecordingProvider to register the functions
  register(start: () => Promise<void>, stop: () => void, abort: () => void) {

    this.startFn = start;
    this.stopFn = stop;
    this.abortFn = abort;
  }

  async start() {
    if (this.startFn) {
      await this.startFn();
    } else {
      console.warn('❌ Recording API not initialized - ensure RecordingProvider is mounted');
    }
  }

  stop() {
    if (this.stopFn) {
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