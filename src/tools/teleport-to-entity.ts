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

export function registerTeleportToEntityTool(factory: any, getBot: () => any) {
  factory.registerTool(
    "teleport-to-entity",
    "Teleports the bot instantly to the position of a specified entity.",
    schema,
    async ({ nameOrType }: { nameOrType: string }) => {
      const bot = getBot();
      // Try to find entity by name or type
      const entity = Object.values<any>(bot.entities).find((e: any) =>
        (e.username && e.username === nameOrType) ||
        (e.name && e.name === nameOrType) ||
        (e.type && e.type === nameOrType)
      ) as any;
      if (!entity || !entity.position) {
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
      return factory.createResponse(`Teleported to entity ${nameOrType} at (${x}, ${y}, ${z}).`);
    }
  );
}
