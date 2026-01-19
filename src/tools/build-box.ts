import { ToolFactory } from "../tool-factory.js";
import { z } from "zod";
import type { Bot } from "mineflayer";

const buildBoxSchema = z.object({
  width: z.number().min(1),
  height: z.number().min(1),
  depth: z.number().min(1),
  blockType: z.string(),
  faceDirection: z.enum(["up", "down", "north", "south", "east", "west"]).optional(),
});

import { log } from "../logger.js";

export function registerBuildBoxTool(factory: any, getBot: () => any) {
  factory.registerTool(
    "build-box",
    "Builds a rectangular box (floor, walls, ceiling) at the bot's position and facing.",
    buildBoxSchema,
    async ({ width, height, depth, blockType, faceDirection }: { width: number; height: number; depth: number; blockType: string; faceDirection?: string }) => {
      log('info', `[build-box] START args: ${JSON.stringify({ width, height, depth, blockType, faceDirection })}`);
      const bot = getBot();
      const pos = bot.entity.position;
      const yaw = bot.entity.yaw;
      // Use find-item tool
      const findItem = factory.server.tools?.find?.((t: any) => t.name === "find-item");
      if (!findItem || typeof findItem.executor !== "function") {
        log('error', '[build-box] find-item tool is not available');
        return factory.createErrorResponse("find-item tool is not available.");
      }
      const found = await findItem.executor({ nameOrType: blockType });
      if (found.isError || !found.content[0]?.text?.includes("Found")) {
        log('error', `[build-box] Block ${blockType} not found in inventory.`);
        return factory.createErrorResponse(`Block ${blockType} not found in inventory.`);
      }
      // Use equip-item tool
      const equipItem = factory.server.tools?.find?.((t: any) => t.name === "equip-item");
      if (!equipItem || typeof equipItem.executor !== "function") {
        log('error', '[build-box] equip-item tool is not available');
        return factory.createErrorResponse("equip-item tool is not available.");
      }
      const equipRes = await equipItem.executor({ itemName: blockType, destination: "hand" });
      if (equipRes.isError) {
        log('error', `[build-box] equip-item failed: ${JSON.stringify(equipRes)}`);
        return equipRes;
      }
      // Use place-block tool
      const placeBlock = factory.server.tools?.find?.((t: any) => t.name === "place-block");
      if (!placeBlock || typeof placeBlock.executor !== "function") {
        return factory.createErrorResponse("place-block tool is not available.");
      }
      // Compute vectors
      const forward = { x: -Math.sin(yaw), z: Math.cos(yaw) };
      const right = { x: -Math.sin(yaw + Math.PI / 2), z: Math.cos(yaw + Math.PI / 2) };
      const x0 = Math.floor(pos.x);
      const y0 = Math.floor(pos.y) - 1;
      const z0 = Math.floor(pos.z);
      const halfWidth = Math.floor(width / 2);
      // Floor
      for (let dz = 0; dz < depth; dz++) {
        for (let dx = -halfWidth; dx < width - halfWidth; dx++) {
          const x = Math.round(x0 + forward.x * dz + right.x * dx);
          const z = Math.round(z0 + forward.z * dz + right.z * dx);
          const y = y0;
          const res = await placeBlock.executor({ x, y, z, faceDirection });
          if (res.isError) return res;
        }
      }
      // Ceiling
      for (let dz = 0; dz < depth; dz++) {
        for (let dx = -halfWidth; dx < width - halfWidth; dx++) {
          const x = Math.round(x0 + forward.x * dz + right.x * dx);
          const z = Math.round(z0 + forward.z * dz + right.z * dx);
          const y = y0 + height;
          const res = await placeBlock.executor({ x, y, z, faceDirection });
          if (res.isError) return res;
        }
      }
      // Walls
      for (let dy = 1; dy < height; dy++) {
        // Front wall
        for (let dx = -halfWidth; dx < width - halfWidth; dx++) {
          const x = Math.round(x0 + right.x * dx);
          const z = Math.round(z0 + right.z * dx);
          const y = y0 + dy;
          const res = await placeBlock.executor({ x, y, z, faceDirection });
          if (res.isError) return res;
        }
        // Back wall
        for (let dx = -halfWidth; dx < width - halfWidth; dx++) {
          const x = Math.round(x0 + forward.x * (depth - 1) + right.x * dx);
          const z = Math.round(z0 + forward.z * (depth - 1) + right.z * dx);
          const y = y0 + dy;
          const res = await placeBlock.executor({ x, y, z, faceDirection });
          if (res.isError) return res;
        }
        // Left wall
        for (let dz = 0; dz < depth; dz++) {
          const x = Math.round(x0 + forward.x * dz - right.x * halfWidth);
          const z = Math.round(z0 + forward.z * dz - right.z * halfWidth);
          const y = y0 + dy;
          const res = await placeBlock.executor({ x, y, z, faceDirection });
          if (res.isError) return res;
        }
        // Right wall
        for (let dz = 0; dz < depth; dz++) {
          const x = Math.round(x0 + forward.x * dz + right.x * (width - halfWidth - 1));
          const z = Math.round(z0 + forward.z * dz + right.z * (width - halfWidth - 1));
          const y = y0 + dy;
          const res = await placeBlock.executor({ x, y, z, faceDirection });
          if (res.isError) return res;
        }
      }
      return factory.createResponse(`Built a ${width}x${height}x${depth} box of ${blockType} blocks.`);
    }
  );
}
