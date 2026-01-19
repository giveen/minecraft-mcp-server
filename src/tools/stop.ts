import { ToolFactory } from "../tool-factory.js";
import { behaviorManager } from "../behaviorManager.js";

const schema = { type: "object", properties: {}, required: [] };

import { log } from "../logger.js";

export function registerStopTool(factory: any) {
  factory.registerTool(
    "stop",
    "Stops all active behavior loops (follow, mining, movement, etc.) and leaves the bot idle.",
    schema,
    async () => {
      log('info', `[stop] START`);
      behaviorManager.cancelAll();
      log('info', `[stop] END: All active actions stopped.`);
      return factory.createResponse("All active actions stopped.");
    }
  );
}
