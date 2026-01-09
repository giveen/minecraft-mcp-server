import mineflayer from 'mineflayer';
import { ToolFactory } from '../tool-factory.js';
import { log } from '../logger.js';

export function registerGameStateTools(factory: ToolFactory, getBot: () => mineflayer.Bot): void {
  factory.registerTool(
    "detect-gamemode",
    "Detect the gamemode on game",
    {},
    async () => {
      const bot = getBot();
      log('info', `Gamestate: mode=${bot.game.gameMode}`);
      return factory.createResponse(`Bot gamemode: "${bot.game.gameMode}"`);
    }
  );
}
