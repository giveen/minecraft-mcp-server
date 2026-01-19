import { Vec3 } from "vec3";

const directions = ["forward", "back", "up", "down"] as const;

const mineTunnelSchema = {
  direction: { type: "string", enum: directions },
  length: { type: "number", minimum: 1, description: "How many blocks long the tunnel should be" }
};

export function registerMineTunnelTool(factory: any, getBot: () => any) {
  factory.registerTool(
    "mine-tunnel",
    "Mines a straight tunnel in a specified direction and length, relative to the bot’s current position and facing.",
    { type: "object", properties: mineTunnelSchema, required: ["direction", "length"] },
    async (args: { direction: string; length: number }) => {
      const { direction, length } = args;
      if (!directions.includes(direction as any)) {
        return factory.createErrorResponse(`Invalid direction: ${direction}`);
      }
      if (length < 1) {
        return factory.createErrorResponse("Length must be at least 1.");
      }
      const bot = getBot();
      const pos = bot.entity.position;
      const yaw = bot.entity.yaw;
      let dx = 0, dy = 0, dz = 0;
      switch (direction) {
        case "up": dy = 1; break;
        case "down": dy = -1; break;
        case "forward":
          dx = Math.round(-Math.sin(yaw));
          dz = Math.round(-Math.cos(yaw));
          break;
        case "back":
          dx = Math.round(Math.sin(yaw));
          dz = Math.round(Math.cos(yaw));
          break;
      }
      let mined = 0;
      for (let step = 1; step <= length; step++) {
        const x = Math.round(pos.x + dx * step);
        const y = Math.round(pos.y + dy * step);
        const z = Math.round(pos.z + dz * step);
        const block = bot.blockAt(new Vec3(x, y, z));
        if (!block) continue;
        try {
          await bot.dig(block);
          mined++;
        } catch (e) {
          // Skip errors, continue
        }
      }
      return factory.createResponse(`Mined a ${length}-block tunnel ${direction}. (${mined} blocks mined)`);
    }
  );
}
