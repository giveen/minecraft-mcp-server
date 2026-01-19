import { ToolFactory } from "../tool-factory.js";

const schema = {
  type: "object",
  properties: {
    x: { type: "number" },
    y: { type: "number" },
    z: { type: "number" }
  },
  required: ["x", "y", "z"]
};

export function registerTeleportToPositionTool(factory: any, getBot: () => any) {
  factory.registerTool(
    "teleport-to-position",
    "Teleports the bot instantly to the specified (x, y, z) coordinates.",
    schema,
    async ({ x, y, z }: { x: number; y: number; z: number }) => {
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return factory.createErrorResponse("Invalid coordinates: x, y, and z must be finite numbers.");
      }
      const bot = getBot();
      if (typeof bot.entity.position.set === "function") {
        bot.entity.position.set(x, y, z);
      } else {
        bot.entity.position.x = x;
        bot.entity.position.y = y;
        bot.entity.position.z = z;
      }
      return factory.createResponse(`Teleported to (${x}, ${y}, ${z}).`);
    }
  );
}
