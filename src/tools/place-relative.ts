import { z } from "zod";
import mineflayer from "mineflayer";
import { ToolFactory } from "../tool-factory.js";
import { log } from "../logger.js";

const directionSchema = z.enum([
  "down", "up", "forward", "back", "left", "right"
]);
const faceDirectionSchema = z.enum([
  "up", "down", "north", "south", "east", "west"
]);

const schema = {
  direction: directionSchema,
  blockType: z.string().describe("The type of block to place"),
  faceDirection: faceDirectionSchema.optional().describe("Optional face direction for placement")
};

export function registerPlaceRelativeTool(factory: ToolFactory, getBot: () => mineflayer.Bot): void {
  factory.registerTool(
    "place-relative",
    "Places a block relative to the bot’s current position and facing direction.",
    schema,
    async ({ direction, blockType, faceDirection }: { direction: z.infer<typeof directionSchema>, blockType: string, faceDirection?: z.infer<typeof faceDirectionSchema> }) => {
      const bot = getBot();
      const pos = bot.entity.position;
      const yaw = bot.entity.yaw;
      let dx = 0, dy = 0, dz = 0;
      switch (direction) {
        case "down": dy = -1; break;
        case "up": dy = 1; break;
        case "forward": dx = -Math.sin(yaw); dz = -Math.cos(yaw); break;
        case "back": dx = Math.sin(yaw); dz = Math.cos(yaw); break;
        case "left": dx = -Math.cos(yaw); dz = Math.sin(yaw); break;
        case "right": dx = Math.cos(yaw); dz = -Math.sin(yaw); break;
        default: return factory.createErrorResponse(`Invalid direction: ${direction}`);
      }
      const targetX = Math.round(pos.x + dx);
      const targetY = Math.round(pos.y + dy);
      const targetZ = Math.round(pos.z + dz);
      log("info", `place-relative: direction=${direction} blockType=${blockType} at (${targetX},${targetY},${targetZ})`);
      // Use find-item tool
      const findItem = (factory as any).server.tools?.find?.((t: any) => t.name === "find-item");
      if (!findItem || typeof findItem.executor !== "function") {
        return factory.createErrorResponse("find-item tool is not available.");
      }
      const found = await findItem.executor({ nameOrType: blockType });
      if (found.isError || !found.content[0]?.text?.includes("Found")) {
        return factory.createErrorResponse(`Block ${blockType} not found in inventory.`);
      }
      // Use equip-item tool
      const equipItem = (factory as any).server.tools?.find?.((t: any) => t.name === "equip-item");
      if (!equipItem || typeof equipItem.executor !== "function") {
        return factory.createErrorResponse("equip-item tool is not available.");
      }
      const equipRes = await equipItem.executor({ itemName: blockType, destination: "hand" });
      if (equipRes.isError) return equipRes;
      // Use place-block tool
      const placeBlock = (factory as any).server.tools?.find?.((t: any) => t.name === "place-block");
      if (!placeBlock || typeof placeBlock.executor !== "function") {
        return factory.createErrorResponse("place-block tool is not available.");
      }
      const placeRes = await placeBlock.executor({ x: targetX, y: targetY, z: targetZ, faceDirection });
      if (placeRes.isError) return placeRes;
      return factory.createResponse(`Placed ${blockType} at (${targetX}, ${targetY}, ${targetZ})`);
    }
  );
}
