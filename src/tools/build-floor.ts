import { ToolFactory } from "../tool-factory.js";
import { z } from "zod";
import type { Bot } from "mineflayer";

const buildFloorSchema = z.object({
  width: z.number().min(1),
  depth: z.number().min(1),
  blockType: z.string(),
  faceDirection: z.enum(["up", "down", "north", "south", "east", "west"]).optional(),
});

export function registerBuildFloorTool(factory: any, getBot: () => any) {
  factory.registerTool(
    "build-floor",
    "Builds a flat floor of blocks with the given width and depth, relative to the bot's facing direction.",
    buildFloorSchema,
    async ({ width, depth, blockType, faceDirection }: { width: number; depth: number; blockType: string; faceDirection?: string }) => {
      const bot = getBot();
      const pos = bot.entity.position;
      const yaw = bot.entity.yaw;
      // Calculate left/right and forward vectors
      const forward = { x: -Math.sin(yaw), z: Math.cos(yaw) };
      const right = { x: -Math.sin(yaw + Math.PI / 2), z: Math.cos(yaw + Math.PI / 2) };
      // Center the floor on the bot (width is left/right, depth is forward)
      const x0 = Math.floor(pos.x);
      const y = Math.floor(pos.y) - 1;
      const z0 = Math.floor(pos.z);
      const halfWidth = Math.floor(width / 2);
      // Use find-item tool
      const findItem = factory.server.tools?.find?.((t: any) => t.name === "find-item");
      if (!findItem || typeof findItem.executor !== "function") {
        return factory.createErrorResponse("find-item tool is not available.");
      }
      const found = await findItem.executor({ nameOrType: blockType });
      if (found.isError || !found.content[0]?.text?.includes("Found")) {
        return factory.createErrorResponse(`Block ${blockType} not found in inventory.`);
      }
      // Use equip-item tool
      const equipItem = factory.server.tools?.find?.((t: any) => t.name === "equip-item");
      if (!equipItem || typeof equipItem.executor !== "function") {
        return factory.createErrorResponse("equip-item tool is not available.");
      }
      const equipRes = await equipItem.executor({ itemName: blockType, destination: "hand" });
      if (equipRes.isError) return equipRes;
      // Use place-block tool for each coordinate in the floor
      const placeBlock = factory.server.tools?.find?.((t: any) => t.name === "place-block");
      if (!placeBlock || typeof placeBlock.executor !== "function") {
        return factory.createErrorResponse("place-block tool is not available.");
      }
      for (let dz = 0; dz < depth; dz++) {
        for (let dx = -halfWidth; dx < width - halfWidth; dx++) {
          const x = Math.round(x0 + forward.x * dz + right.x * dx);
          const z = Math.round(z0 + forward.z * dz + right.z * dx);
          const placeRes = await placeBlock.executor({ x, y, z, faceDirection });
          if (placeRes.isError) return placeRes;
        }
      }
      return factory.createResponse(`Built a ${width}x${depth} floor of ${blockType} blocks.`);
    }
  );
}
