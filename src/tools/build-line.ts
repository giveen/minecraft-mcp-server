import { ToolFactory } from "../tool-factory.js";
import { z } from "zod";
import type { Bot } from "mineflayer";

const buildLineSchema = z.object({
  direction: z.enum(["forward", "back", "left", "right", "up", "down"]),
  length: z.number().min(1),
  blockType: z.string(),
  faceDirection: z.enum(["up", "down", "north", "south", "east", "west"]).optional(),
});

function computeOffsets(direction: string, yaw: number): { x: number; y: number; z: number } {
  switch (direction) {
    case "up":
      return { x: 0, y: 1, z: 0 };
    case "down":
      return { x: 0, y: -1, z: 0 };
    case "forward": {
      const x = -Math.sin(yaw);
      const z = Math.cos(yaw);
      return { x: Math.round(x), y: 0, z: Math.round(z) };
    }
    case "back": {
      const x = Math.sin(yaw);
      const z = -Math.cos(yaw);
      return { x: Math.round(x), y: 0, z: Math.round(z) };
    }
    case "left": {
      const x = -Math.sin(yaw - Math.PI / 2);
      const z = Math.cos(yaw - Math.PI / 2);
      return { x: Math.round(x), y: 0, z: Math.round(z) };
    }
    case "right": {
      const x = -Math.sin(yaw + Math.PI / 2);
      const z = Math.cos(yaw + Math.PI / 2);
      return { x: Math.round(x), y: 0, z: Math.round(z) };
    }
    default:
      return { x: 0, y: 0, z: 0 };
  }
}

export function registerBuildLineTool(factory: any, getBot: () => any) {
  factory.registerTool(
    "build-line",
    "Places a line of blocks in a specified direction and length, relative to the bot’s position and facing.",
    buildLineSchema,
    async ({ direction, length, blockType, faceDirection }: { direction: string; length: number; blockType: string; faceDirection?: string }) => {
      const bot = getBot();
      const pos = bot.entity.position;
      const yaw = bot.entity.yaw;
      const offset = computeOffsets(direction, yaw);

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
      // Use place-block tool for each coordinate
      const placeBlock = factory.server.tools?.find?.((t: any) => t.name === "place-block");
      if (!placeBlock || typeof placeBlock.executor !== "function") {
        return factory.createErrorResponse("place-block tool is not available.");
      }
      let x = Math.floor(pos.x);
      let y = Math.floor(pos.y) - 1;
      let z = Math.floor(pos.z);
      for (let i = 0; i < length; i++) {
        const placeRes = await placeBlock.executor({ x, y, z, faceDirection });
        if (placeRes.isError) return placeRes;
        x += offset.x;
        y += offset.y;
        z += offset.z;
      }
      return factory.createResponse(`Built a line of ${length} ${blockType} blocks ${direction}.`);
    }
  );
}
