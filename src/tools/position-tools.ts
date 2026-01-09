import { z } from "zod";
import mineflayer from 'mineflayer';
import pathfinderPkg from 'mineflayer-pathfinder';
const { goals } = pathfinderPkg;
import { Vec3 } from 'vec3';
import { ToolFactory } from '../tool-factory.js';
import { log } from '../logger.js';

type Direction = 'forward' | 'back' | 'left' | 'right';

export function registerPositionTools(factory: ToolFactory, getBot: () => mineflayer.Bot): void {
  factory.registerTool(
    "get-position",
    "Get the current position of the bot",
    {},
    async () => {
      const bot = getBot();
      const position = bot.entity.position;
      const pos = {
        x: Math.floor(position.x),
        y: Math.floor(position.y),
        z: Math.floor(position.z)
      };
      log('info', `Position: current=(${pos.x}, ${pos.y}, ${pos.z})`);
      return factory.createResponse(`Current position: (${pos.x}, ${pos.y}, ${pos.z})`);
    }
  );

  factory.registerTool(
    "move-to-position",
    "Move the bot to a specific position",
    {
      x: z.number().describe("X coordinate"),
      y: z.number().describe("Y coordinate"),
      z: z.number().describe("Z coordinate"),
      range: z.number().optional().describe("How close to get to the target (default: 1)")
    },
    async ({ x, y, z, range = 1 }) => {
      const bot = getBot();
      log('info', `Position: move-to-position start target=(${x}, ${y}, ${z}) range=${range}`);
      const goal = new goals.GoalNear(x, y, z, range);
      await bot.pathfinder.goto(goal);
      log('info', `Position: move-to-position arrived near target`);
      return factory.createResponse(`Successfully moved to position near (${x}, ${y}, ${z})`);
    }
  );

  factory.registerTool(
    "look-at",
    "Make the bot look at a specific position",
    {
      x: z.number().describe("X coordinate"),
      y: z.number().describe("Y coordinate"),
      z: z.number().describe("Z coordinate"),
    },
    async ({ x, y, z }) => {
      const bot = getBot();
      log('info', `Position: look-at target=(${x}, ${y}, ${z})`);
      await bot.lookAt(new Vec3(x, y, z), true);
      return factory.createResponse(`Looking at position (${x}, ${y}, ${z})`);
    }
  );

  factory.registerTool(
    "jump",
    "Make the bot jump",
    {},
    async () => {
      const bot = getBot();
      try {
        log('info', 'Jump: toggling control state');
        bot.setControlState('jump', true);
        await new Promise(resolve => setTimeout(resolve, 250));
        bot.setControlState('jump', false);
        log('info', 'Jump: completed');
        return factory.createResponse("Successfully jumped");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log('error', `Jump failed: ${msg}`);
        return factory.createErrorResponse(`Jump failed: ${msg}`);
      }
    }
  );

  factory.registerTool(
    "move-in-direction",
    "Move the bot in a specific direction for a duration",
    {
      direction: z.enum(['forward', 'back', 'left', 'right']).describe("Direction to move"),
      duration: z.number().optional().describe("Duration in milliseconds (default: 1000)")
    },
    async ({ direction, duration = 1000 }: { direction: Direction, duration?: number }) => {
      const bot = getBot();
      log('info', `Position: move-in-direction start direction=${direction} duration=${duration}`);
      return new Promise((resolve) => {
        bot.setControlState(direction, true);
        setTimeout(() => {
          bot.setControlState(direction, false);
          log('info', `Position: move-in-direction done direction=${direction}`);
          resolve(factory.createResponse(`Moved ${direction} for ${duration}ms`));
        }, duration);
      });
    }
  );
}
