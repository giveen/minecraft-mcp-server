// Simple behavior manager for managing and cancelling long-running loops
export class BehaviorManager {
  private loops: Map<string, NodeJS.Timeout | NodeJS.Timer> = new Map();

  registerLoop(id: string, handle: NodeJS.Timeout | NodeJS.Timer) {
    this.cancelLoop(id);
    this.loops.set(id, handle);
  }

  cancelLoop(id: string) {
    const handle = this.loops.get(id);
    if (handle) {
      clearInterval(handle as NodeJS.Timeout);
      clearTimeout(handle as NodeJS.Timeout);
      this.loops.delete(id);
    }
  }

  cancelAll() {
    for (const id of this.loops.keys()) {
      this.cancelLoop(id);
    }
  }

  hasActiveLoops() {
    return this.loops.size > 0;
  }
}

// Singleton instance
export const behaviorManager = new BehaviorManager();
