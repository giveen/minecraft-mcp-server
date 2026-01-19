import { z } from "zod";
import mineflayer from "mineflayer";
import { ToolFactory } from "../tool-factory.js";
import { log } from "../logger.js";
import { FollowManager } from "../followManager.js";

const schema = {
  name: z.string().describe("Exact username of the player to follow"),
  distance: z.number().min(0).optional().describe("Desired distance to maintain from the player (default: 2)"),
  interval: z.number().min(100).optional().describe("Milliseconds between position checks (default: 500)")
};

// One follow manager per bot instance
const followManagers = new WeakMap<mineflayer.Bot, FollowManager>();

export function registerFollowPlayerTool(factory: ToolFactory, getBot: () => mineflayer.Bot): void {
  factory.registerTool(
    "follow-player",
    "Continuously follows the specified player, updating the bot’s path as the player moves.",
    schema,
    async ({ name, distance = 2, interval = 500 }: { name: string; distance?: number; interval?: number }) => {
      const bot = getBot();
      if (!followManagers.has(bot)) followManagers.set(bot, new FollowManager());
      const followManager = followManagers.get(bot)!;
      // Find the player entity by username (case-sensitive)
      let entity = Object.values(bot.entities).find(
        (e: any) => e.type === 'player' && e.username === name
      );
      if (!entity || !entity.position) {
        return factory.createErrorResponse(`Player ${name} not found.`);
      }
      // Find the move-to-position tool handler from the factory's server
      const moveTo = (factory as any).server.tools?.find?.((t: any) => t.name === "move-to-position");
      if (!moveTo || typeof moveTo.executor !== "function") {
        return factory.createErrorResponse("move-to-position tool is not available.");
      }
      // Start follow loop
      followManager.start(async () => {
        entity = Object.values(bot.entities).find(
          (e: any) => e.type === 'player' && e.username === name
        );
        if (!entity || !entity.position) {
          log('info', `follow-player: Player ${name} no longer found, stopping follow.`);
          return false;
        }
        const botPos = bot.entity.position;
        const playerPos = entity.position;
        const dx = botPos.x - playerPos.x;
        const dy = botPos.y - playerPos.y;
        const dz = botPos.z - playerPos.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist > distance) {
          log('info', `follow-player: distance ${dist} > ${distance}, moving to player.`);
          await moveTo.executor({ x: playerPos.x, y: playerPos.y, z: playerPos.z, range: distance });
        }
        return true;
      }, interval);
      return factory.createResponse(`Following ${name} at distance ${distance}.`);
    }
  );
}
