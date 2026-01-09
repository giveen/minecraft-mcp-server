import { z } from "zod";
import mineflayer from 'mineflayer';
import pathfinderPkg from 'mineflayer-pathfinder';
const { goals } = pathfinderPkg;
import { Vec3 } from 'vec3';
import minecraftData from 'minecraft-data';
import { ToolFactory } from '../tool-factory.js';
import { log } from '../logger.js';

type FaceDirection = 'up' | 'down' | 'north' | 'south' | 'east' | 'west';

interface FaceOption {
  direction: string;
  vector: Vec3;
}

export function registerBlockTools(factory: ToolFactory, getBot: () => mineflayer.Bot): void {
  factory.registerTool(
    "place-block",
    "Place a block at the specified position",
    {
      x: z.number().describe("X coordinate"),
      y: z.number().describe("Y coordinate"),
      z: z.number().describe("Z coordinate"),
      faceDirection: z.enum(['up', 'down', 'north', 'south', 'east', 'west']).optional().describe("Direction to place against (default: 'down')")
    },
    async ({ x, y, z, faceDirection = 'down' }: { x: number, y: number, z: number, faceDirection?: FaceDirection }) => {
      const bot = getBot();
      log('info', `Block: place-block start pos=(${x}, ${y}, ${z}) faceDirection=${faceDirection}`);
      const placePos = new Vec3(x, y, z);
      const blockAtPos = bot.blockAt(placePos);

      if (blockAtPos && blockAtPos.name !== 'air') {
        log('warn', `Block: place-block target occupied by ${blockAtPos.name}`);
        return factory.createResponse(`There's already a block (${blockAtPos.name}) at (${x}, ${y}, ${z})`);
      }

      const possibleFaces: FaceOption[] = [
        { direction: 'down', vector: new Vec3(0, -1, 0) },
        { direction: 'north', vector: new Vec3(0, 0, -1) },
        { direction: 'south', vector: new Vec3(0, 0, 1) },
        { direction: 'east', vector: new Vec3(1, 0, 0) },
        { direction: 'west', vector: new Vec3(-1, 0, 0) },
        { direction: 'up', vector: new Vec3(0, 1, 0) }
      ];

      if (faceDirection !== 'down') {
        const specificFace = possibleFaces.find(face => face.direction === faceDirection);
        if (specificFace) {
          possibleFaces.unshift(possibleFaces.splice(possibleFaces.indexOf(specificFace), 1)[0]);
        }
      }

      for (const face of possibleFaces) {
        const referencePos = placePos.plus(face.vector);
        const referenceBlock = bot.blockAt(referencePos);

        if (referenceBlock && referenceBlock.name !== 'air') {
          if (!bot.canSeeBlock(referenceBlock)) {
            const goal = new goals.GoalNear(referencePos.x, referencePos.y, referencePos.z, 2);
            await bot.pathfinder.goto(goal);
            log('info', `Block: moved near reference block at (${referencePos.x}, ${referencePos.y}, ${referencePos.z})`);
          }

          await bot.lookAt(placePos, true);

          try {
            await bot.placeBlock(referenceBlock, face.vector.scaled(-1));
            log('info', `Block: placed at (${x}, ${y}, ${z}) using ${face.direction}`);
            return factory.createResponse(`Placed block at (${x}, ${y}, ${z}) using ${face.direction} face`);
          } catch (placeError) {
            log('warn', `Failed to place using ${face.direction} face: ${placeError}`);
            continue;
          }
        }
      }

      log('info', `Block: place-block failed at (${x}, ${y}, ${z}) — no reference block`);
      return factory.createResponse(`Failed to place block at (${x}, ${y}, ${z}): No suitable reference block found`);
    }
  );

  

  factory.registerTool(
    "dig-block",
    "Dig a block at the specified position",
    {
      x: z.number().describe("X coordinate"),
      y: z.number().describe("Y coordinate"),
      z: z.number().describe("Z coordinate"),
    },
    async ({ x, y, z }) => {
      const bot = getBot();
      log('info', `Block: dig-block start pos=(${x}, ${y}, ${z})`);
      const blockPos = new Vec3(x, y, z);
      const block = bot.blockAt(blockPos);

      if (!block || block.name === 'air') {
        log('info', 'Block: no block to dig');
        return factory.createResponse(`No block found at position (${x}, ${y}, ${z})`);
      }

      if (!bot.canDigBlock(block) || !bot.canSeeBlock(block)) {
        const goal = new goals.GoalNear(x, y, z, 2);
        await bot.pathfinder.goto(goal);
        log('info', 'Block: moved near block to dig');
      }

      await bot.dig(block);
      log('info', `Block: dug ${block.name} at (${x}, ${y}, ${z})`);
      return factory.createResponse(`Dug ${block.name} at (${x}, ${y}, ${z})`);
    }
  );

  factory.registerTool(
    "get-block-info",
    "Get information about a block at the specified position",
    {
      x: z.number().describe("X coordinate"),
      y: z.number().describe("Y coordinate"),
      z: z.number().describe("Z coordinate"),
    },
    async ({ x, y, z }) => {
      const bot = getBot();
      log('info', `Block: get-block-info pos=(${x}, ${y}, ${z})`);
      const blockPos = new Vec3(x, y, z);
      const block = bot.blockAt(blockPos);

      if (!block) {
        log('info', 'Block: no block info available');
        return factory.createResponse(`No block information found at position (${x}, ${y}, ${z})`);
      }

      log('info', `Block: info ${block.name} type=${block.type} at (${block.position.x}, ${block.position.y}, ${block.position.z})`);
      return factory.createResponse(`Found ${block.name} (type: ${block.type}) at position (${block.position.x}, ${block.position.y}, ${block.position.z})`);
    }
  );

  factory.registerTool(
    "find-block",
    "Find the nearest block of a specific type",
    {
      blockType: z.string().describe("Type of block to find"),
      maxDistance: z.number().optional().describe("Maximum search distance (default: 16)")
    },
    async ({ blockType, maxDistance = 16 }) => {
      const bot = getBot();
      log('info', `Block: find-block start type=${blockType} maxDistance=${maxDistance}`);
      const mcData = minecraftData(bot.version);
      const blocksByName = mcData.blocksByName;

      if (!blocksByName[blockType]) {
        log('warn', `Block: unknown block type ${blockType}`);
        return factory.createResponse(`Unknown block type: ${blockType}`);
      }

      const blockId = blocksByName[blockType].id;

      const block = bot.findBlock({
        matching: blockId,
        maxDistance: maxDistance
      });

      if (!block) {
        log('info', `Block: not found type=${blockType} within ${maxDistance}`);
        return factory.createResponse(`No ${blockType} found within ${maxDistance} blocks`);
      }

      log('info', `Block: found ${blockType} at (${block.position.x}, ${block.position.y}, ${block.position.z})`);
      return factory.createResponse(`Found ${blockType} at position (${block.position.x}, ${block.position.y}, ${block.position.z})`);
    }
  );
}
