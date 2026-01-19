import { ToolFactory } from "../tool-factory.js";

const schema = {
  type: "object",
  properties: {
    nameOrType: {
      type: "string",
      description: "Entity name or type to teleport to (e.g., player name, 'player', 'mob', etc.)"
    }
  },
  required: ["nameOrType"]
};

import { log } from "../logger.js";

export function registerTeleportToEntityTool(factory: any, getBot: () => any) {
  factory.registerTool(
    "teleport-to-entity",
    "Teleports the bot instantly to the position of a specified entity.",
    schema,
    async ({ nameOrType }: { nameOrType: string }) => {
      log('info', `[teleport-to-entity] START args: ${JSON.stringify({ nameOrType })}`);
      const bot = getBot();
      // Try to find entity by name or type
      const entity = Object.values<any>(bot.entities).find((e: any) =>
        (e.username && e.username === nameOrType) ||
        (e.name && e.name === nameOrType) ||
        (e.type && e.type === nameOrType)
      ) as any;
      if (!entity || !entity.position) {
        log('error', `[teleport-to-entity] Entity ${nameOrType} not found.`);
        return factory.createErrorResponse(`Entity ${nameOrType} not found.`);
      }
      const { x, y, z } = entity.position as any;
      if (typeof bot.entity.position.set === "function") {
        bot.entity.position.set(x, y, z);
      } else {
        bot.entity.position.x = x;
        bot.entity.position.y = y;
        bot.entity.position.z = z;
      }
      log('info', `[teleport-to-entity] END: Teleported to entity ${nameOrType} at (${x}, ${y}, ${z})`);
      return factory.createResponse(`Teleported to entity ${nameOrType} at (${x}, ${y}, ${z}).`);
    }
  );
}
