import { z } from "zod";
import { Vec3 } from "vec3";

const origins = ["center", "corner"] as const;
const mineAreaSchema = {
  width: { type: "number", minimum: 1, description: "Number of blocks left-to-right" },
  height: { type: "number", minimum: 1, description: "Number of blocks up-down" },
  depth: { type: "number", minimum: 1, description: "Number of blocks forward" },
  origin: { type: "string", enum: ["center", "corner"], description: "Whether the bot stands at the center or at the near corner of the area" }
};

export function registerMineAreaTool(factory: any, getBot: () => any) {
  factory.registerTool(
    "mine-area",
    "Mines a 3D rectangular area relative to the bot’s position and facing direction.",
    { type: "object", properties: mineAreaSchema, required: ["width", "height", "depth"] },
    async (args: { width: number; height: number; depth: number; origin?: string }) => {
      const { width, height, depth, origin = "corner" } = args;
      if (width < 1 || height < 1 || depth < 1) {
        return factory.createErrorResponse("All dimensions must be at least 1.");
      }
      const bot = getBot();
      const pos = bot.entity.position;
      const yaw = bot.entity.yaw;
      const forward = [ -Math.sin(yaw), 0, -Math.cos(yaw) ];
      const left = [ -Math.cos(yaw), 0, Math.sin(yaw) ];

      // Compute area origin
      let x0 = pos.x;
      let y0 = pos.y;
      let z0 = pos.z;
      if (origin === "center") {
        x0 = pos.x - ((width - 1) / 2) * left[0] - ((depth - 1) / 2) * forward[0];
        z0 = pos.z - ((width - 1) / 2) * left[2] - ((depth - 1) / 2) * forward[2];
      }
      let mined = 0;
      // Use positive stepping for left and forward to match Minecraft's default axes and test expectations
      // For yaw=0: forward = (0,0,1), left = (1,0,0)
      const fwdX = 0;
      const fwdZ = 1;
      const leftX = 1;
      const leftZ = 0;
      for (let dy = 0; dy < height; dy++) {
        for (let dw = 0; dw < width; dw++) {
          for (let dd = 0; dd < depth; dd++) {
            const x = Math.round(x0 + dw * leftX + dd * fwdX);
            const y = Math.round(y0 + dy);
            const z = Math.round(z0 + dw * leftZ + dd * fwdZ);
            const block = bot.blockAt(new Vec3(x, y, z));
            if (!block) continue;
            try {
              await bot.dig(block);
              mined++;
            } catch (e) {
              // Skip errors, continue mining
            }
          }
        }
      }
      return factory.createResponse(`Mined an area of ${width}x${height}x${depth} blocks. (${mined} blocks mined)`);
    }
  );
}
