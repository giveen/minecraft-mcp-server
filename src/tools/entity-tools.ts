import { z } from "zod";
import type { Bot } from 'mineflayer';
import { ToolFactory } from '../tool-factory.js';
import { log } from '../logger.js';

type Entity = ReturnType<Bot['nearestEntity']>;

export function registerEntityTools(factory: ToolFactory, getBot: () => Bot): void {
  factory.registerTool(
    "find-entity",
    "Find the nearest entity of a specific type",
    {
      type: z.string().optional().describe("Type of entity to find (empty for any entity)"),
      maxDistance: z.number().optional().describe("Maximum search distance (default: 16)")
    },
    async ({ type = '', maxDistance = 16 }) => {
      const bot = getBot();
      log('info', `Entity: find-entity start type=${type || 'any'} maxDistance=${maxDistance}`);
      const entityFilter = (entity: NonNullable<Entity>) => {
        if (!type) return true;
        if (type === 'player') return entity.type === 'player';
        if (type === 'mob') return entity.type === 'mob';
        return Boolean(entity.name && entity.name.includes(type.toLowerCase()));
      };

      const entity = bot.nearestEntity(entityFilter);

      if (!entity || bot.entity.position.distanceTo(entity.position) > maxDistance) {
        log('info', `Entity: none found within ${maxDistance}`);
        return factory.createResponse(`No ${type || 'entity'} found within ${maxDistance} blocks`);
      }

      const entityName = entity.name || (entity as { username?: string }).username || entity.type;
      log('info', `Entity: found ${entityName} at (${Math.floor(entity.position.x)}, ${Math.floor(entity.position.y)}, ${Math.floor(entity.position.z)})`);
      return factory.createResponse(`Found ${entityName} at position (${Math.floor(entity.position.x)}, ${Math.floor(entity.position.y)}, ${Math.floor(entity.position.z)})`);
    }
  );
}
