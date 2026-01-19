import { z } from "zod";
import mineflayer from "mineflayer";
import { ToolFactory } from "../tool-factory.js";
import { log } from "../logger.js";

const directionSchema = z.enum([
  "forward",
  "back",
  "left",
  "right",
  "up",
  "down"
]);

export function registerMoveRelativeTool(factory: ToolFactory, getBot: () => mineflayer.Bot): void {
  factory.registerTool(
    "move-relative",
    "Moves the bot a specified number of blocks in a relative direction based on its current facing direction.",
    {
      direction: directionSchema.describe(
        "Direction relative to the bot: forward, back, left, right, up, down"
      ),
      blocks: z.number().min(1).describe("Number of blocks to move")
    },
    async ({ direction, blocks }: { direction: z.infer<typeof directionSchema>, blocks: number }) => {
      const bot = getBot();
      const pos = bot.entity.position;
      const yaw = bot.entity.yaw;
      let dx = 0, dy = 0, dz = 0;
      switch (direction) {
        case "up":
          dy = blocks;
          break;
        case "down":
          dy = -blocks;
          break;
        case "forward":
          dx = -Math.sin(yaw) * blocks;
          dz = -Math.cos(yaw) * blocks;
          break;
        case "back":
          dx = Math.sin(yaw) * blocks;
          dz = Math.cos(yaw) * blocks;
          break;
        case "left":
          dx = -Math.cos(yaw) * blocks;
          dz = Math.sin(yaw) * blocks;
          break;
        case "right":
          dx = Math.cos(yaw) * blocks;
          dz = -Math.sin(yaw) * blocks;
          break;
        default:
          return factory.createErrorResponse(`Invalid direction: ${direction}`);
      }
      const targetX = Math.round(pos.x + dx);
      const targetY = Math.round(pos.y + dy);
      const targetZ = Math.round(pos.z + dz);
      log(
        "info",
        `move-relative: direction=${direction} blocks=${blocks} from=(${pos.x},${pos.y},${pos.z}) to=(${targetX},${targetY},${targetZ})`
      );
      // Find the move-to-position tool handler from the factory's server
      const moveTo = (factory as any).server.tools?.find?.((t: any) => t.name === "move-to-position");
      if (!moveTo || typeof moveTo.executor !== "function") {
        return factory.createErrorResponse("move-to-position tool is not available.");
      }
      try {
        const res = await moveTo.executor({ x: targetX, y: targetY, z: targetZ, range: 1 });
        if (res.isError) return res;
        return factory.createResponse(
          `Moved ${blocks} block(s) ${direction} to (${targetX}, ${targetY}, ${targetZ})`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return factory.createErrorResponse(
          `Failed to move ${direction}: ${msg}`
        );
      }
    }
  );
}
