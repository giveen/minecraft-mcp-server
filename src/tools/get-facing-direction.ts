import { ToolFactory } from "../tool-factory.js";

const schema = { type: "object", properties: {}, required: [] };

function yawToCardinal(yaw: number): string {
  // Convert yaw (radians) to degrees, normalize to 0-360
  let deg = (yaw * 180) / Math.PI;
  deg = ((deg % 360) + 360) % 360;
  // Minecraft: 0 = -Z (south), 90 = -X (west), 180 = +Z (north), 270 = +X (east)
  if (deg >= 315 || deg < 45) return "south";
  if (deg >= 45 && deg < 135) return "west";
  if (deg >= 135 && deg < 225) return "north";
  return "east";
}

export function registerGetFacingDirectionTool(factory: any, getBot: () => any) {
  factory.registerTool(
    "get-facing-direction",
    "Returns the bot’s current facing direction as a cardinal direction.",
    schema,
    async () => {
      const bot = getBot();
      const yaw = bot.entity.yaw;
      const direction = yawToCardinal(yaw);
      return {
        content: [
          { type: "json", direction },
          { type: "text", text: `Facing ${direction}.` }
        ]
      };
    }
  );
}
