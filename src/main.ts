import { registerBuildLineTool } from './tools/build-line.js';
import { registerTeleportToPositionTool } from './tools/teleport-to-position.js';
import { registerTeleportToEntityTool } from './tools/teleport-to-entity.js';
import { registerStopTool } from './tools/stop.js';
import { registerGetFacingDirectionTool } from './tools/get-facing-direction.js';
import { registerMineTunnelTool } from './tools/mine-tunnel.js';
import { registerBuildFloorTool } from "./tools/build-floor.js";
import { registerBuildBoxTool } from "./tools/build-box.js";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupStdioFiltering } from './stdio-filter.js';
import { log, configureLogger } from './logger.js';
import { parseConfig } from './config.js';
import { BotConnection } from './bot-connection.js';
import { ToolFactory } from './tool-factory.js';
import { MessageStore } from './message-store.js';
import { registerPositionTools } from './tools/position-tools.js';
import { registerInventoryTools } from './tools/inventory-tools.js';
import { registerBlockTools } from './tools/block-tools.js';
import { registerEntityTools } from './tools/entity-tools.js';
import { registerChatTools } from './tools/chat-tools.js';
import { registerFlightTools } from './tools/flight-tools.js';
import { registerGameStateTools } from './tools/gamestate-tools.js';

import { registerMineRelativeTool } from './tools/mine-relative.js';
import { registerMoveRelativeTool } from './tools/move-relative.js';
import { registerGoToPlayerTool } from './tools/go-to-player.js';
import { registerFollowPlayerTool } from './tools/follow-player.js';
import { registerPlaceRelativeTool } from './tools/place-relative.js';
import { registerMineAreaTool } from './tools/mine-area.js';
import { registerCraftingTools } from './tools/crafting-tools.js';

process.on('unhandledRejection', (reason) => {
  log('error', `Unhandled rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
  log('error', `Uncaught exception: ${error}`);
});

async function main() {
  const config = parseConfig();
  // Only enable stdio filtering when running under AnythingLLM bridge
  if (config.anythingLLM) {
    setupStdioFiltering();
  }
  if (config.logFile) {
    configureLogger({ logFile: config.logFile });
    log('info', `File logging enabled: ${config.logFile}`);
  }
  const messageStore = new MessageStore();

  const connection = new BotConnection(
    config,
    {
      onLog: log,
      onChatMessage: (username, message) => messageStore.addMessage(username, message)
    }
  );

  connection.connect();

  const server = new McpServer({
    name: "minecraft-mcp-server",
    version: "2.0.1"
  });

  const factory = new ToolFactory(server, connection);
  const getBot = () => connection.getBot()!;

  registerPositionTools(factory, getBot);
  registerInventoryTools(factory, getBot);
  registerBlockTools(factory, getBot);
  registerEntityTools(factory, getBot);
  registerChatTools(factory, getBot, messageStore);
  registerFlightTools(factory, getBot);
  registerGameStateTools(factory, getBot);
  registerMineRelativeTool(factory, getBot);
  registerMoveRelativeTool(factory, getBot);
  registerGoToPlayerTool(factory, getBot);
  registerFollowPlayerTool(factory, getBot);
  registerPlaceRelativeTool(factory, getBot);
  registerCraftingTools(factory, getBot);
  registerMineAreaTool(factory, getBot);
  registerMineTunnelTool(factory, getBot);
  registerGetFacingDirectionTool(factory, getBot);
  registerStopTool(factory);
  registerTeleportToEntityTool(factory, getBot);
  registerTeleportToPositionTool(factory, getBot);
  registerBuildLineTool(factory, getBot);
  registerBuildFloorTool(factory, getBot);
  registerBuildBoxTool(factory, getBot);

  process.stdin.on('end', () => {
    connection.cleanup();
    log('info', 'MCP Client has disconnected. Shutting down...');
    process.exit(0);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  log('error', `Fatal error in main(): ${error}`);
  process.exit(1);
});
