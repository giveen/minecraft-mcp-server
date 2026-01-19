import { ToolFactory } from "../tool-factory.js";
import { behaviorManager } from "../behaviorManager.js";

const schema = { type: "object", properties: {}, required: [] };

export function registerStopTool(factory: any) {
  factory.registerTool(
    "stop",
    "Stops all active behavior loops (follow, mining, movement, etc.) and leaves the bot idle.",
    schema,
    async () => {
      behaviorManager.cancelAll();
      return factory.createResponse("All active actions stopped.");
    }
  );
}
