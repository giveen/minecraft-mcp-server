import { z } from "zod";
import mineflayer from "mineflayer";
import { Vec3 } from "vec3";
import { ToolFactory } from "../tool-factory.js";
import { log } from "../logger.js";

const directionSchema = z.enum([
  "down",
  "up",
  "forward",
  "back",
  "left",
  "right"
]);

export function registerMineRelativeTool(factory: ToolFactory, getBot: () => mineflayer.Bot): void {
  factory.registerTool(
    "mine-relative",
    "Mines a block relative to the bot’s current position and facing direction.",
    {
      direction: directionSchema.describe(
        "Direction relative to the bot: down, up, forward, back, left, right"
      ),
    },
    async ({ direction }: { direction: z.infer<typeof directionSchema> }) => {
      const bot = getBot();
      const pos = bot.entity.position;
      const yaw = bot.entity.yaw;
      let target: Vec3;

      switch (direction) {
        case "down":
          target = pos.offset(0, -1, 0);
          break;
        case "up":
          target = pos.offset(0, 1, 0);
          break;
        case "forward": {
          const dx = -Math.sin(yaw);
          const dz = -Math.cos(yaw);
          target = pos.offset(Math.round(dx), 0, Math.round(dz));
          break;
        }
        case "back": {
          const dx = Math.sin(yaw);
          const dz = Math.cos(yaw);
          target = pos.offset(Math.round(dx), 0, Math.round(dz));
          break;
        }
        case "left": {
          const dx = -Math.cos(yaw);
          const dz = Math.sin(yaw);
          target = pos.offset(Math.round(dx), 0, Math.round(dz));
          break;
        }
        case "right": {
          const dx = Math.cos(yaw);
          const dz = -Math.sin(yaw);
          target = pos.offset(Math.round(dx), 0, Math.round(dz));
          break;
        }
        default:
          return factory.createErrorResponse(
            `Invalid direction: ${direction}`
          );
      }

      log(
        "info",
        `mine-relative: direction=${direction} from=(${pos.x},${pos.y},${pos.z}) to=(${target.x},${target.y},${target.z})`
      );
      const block = bot.blockAt(target);
      if (!block || block.name === "air") {
        return factory.createErrorResponse(
          `No block found to mine at (${target.x}, ${target.y}, ${target.z})`
        );
      }
      try {
        await bot.dig(block);
        return factory.createResponse(
          `Mined ${block.name} at (${target.x}, ${target.y}, ${target.z})`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return factory.createErrorResponse(
          `Failed to mine block at (${target.x}, ${target.y}, ${target.z}): ${msg}`
        );
      }
    }
  );
}
