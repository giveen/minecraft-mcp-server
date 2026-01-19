import { z } from "zod";
import mineflayer from "mineflayer";
import { ToolFactory } from "../tool-factory.js";
import { log } from "../logger.js";

const schema = {
  name: z.string().describe("The exact username of the player to move to"),
  range: z.number().min(0).optional().describe("How close to get to the player (default: 1)")
};

export function registerGoToPlayerTool(factory: ToolFactory, getBot: () => mineflayer.Bot): void {
  factory.registerTool(
    "go-to-player",
    "Finds the nearest entity matching the given player name and moves the bot to that player’s position.",
    schema,
    async ({ name, range = 1 }: { name: string; range?: number }) => {
      const bot = getBot();
      // Find the player entity by username (case-sensitive)
      const entity = Object.values(bot.entities).find(
        (e: any) => e.type === 'player' && e.username === name
      );
      if (!entity || !entity.position) {
        return factory.createErrorResponse(`Player ${name} not found within range.`);
      }
      const { x, y, z } = entity.position;
      log('info', `go-to-player: found ${name} at (${x}, ${y}, ${z}), moving to player`);
      // Find the move-to-position tool handler from the factory's server
      const moveTo = (factory as any).server.tools?.find?.((t: any) => t.name === "move-to-position");
      if (!moveTo || typeof moveTo.executor !== "function") {
        return factory.createErrorResponse("move-to-position tool is not available.");
      }
      try {
        const res = await moveTo.executor({ x, y, z, range });
        if (res.isError) return res;
        return factory.createResponse(
          `Moved to player ${name} at (${x}, ${y}, ${z})`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return factory.createErrorResponse(
          `Failed to move to player ${name}: ${msg}`
        );
      }
    }
  );
}
