// Simple follow manager to allow only one follow loop at a time per bot
export class FollowManager {
  private followInterval: NodeJS.Timeout | null = null;
  private stopRequested = false;

  start(loop: () => Promise<boolean>, interval: number) {
    this.stop();
    this.stopRequested = false;
    this.followInterval = setInterval(async () => {
      if (this.stopRequested) return;
      const shouldContinue = await loop();
      if (!shouldContinue) this.stop();
    }, interval);
  }

  stop() {
    if (this.followInterval) clearInterval(this.followInterval);
    this.followInterval = null;
    this.stopRequested = true;
  }
}
