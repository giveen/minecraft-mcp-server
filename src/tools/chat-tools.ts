import { z } from "zod";
import mineflayer from 'mineflayer';
import { ToolFactory } from '../tool-factory.js';
import { MessageStore } from '../message-store.js';
import { log } from '../logger.js';

export function registerChatTools(factory: ToolFactory, getBot: () => mineflayer.Bot, messageStore: MessageStore): void {
  factory.registerTool(
    "send-chat",
    "Send a chat message in-game",
    {
      message: z.string().describe("Message to send in chat")
    },
    async ({ message }) => {
      const bot = getBot();
      log('info', `Chat: sending message: ${JSON.stringify(message)}`);
      bot.chat(message);
      log('info', 'Chat: message sent');
      return factory.createResponse(`Sent message: "${message}"`);
    }
  );



  factory.registerTool(
    "read-chat",
    "Get recent chat messages from players",
    {
      count: z.number().optional().describe("Number of recent messages to retrieve (default: 10, max: 100)")
    },
    async ({ count = 10 }) => {
      const maxCount = Math.min(count, messageStore.getMaxMessages());
      log('info', `Chat: reading recent messages count=${maxCount}`);
      const messages = messageStore.getRecentMessages(maxCount);

      if (messages.length === 0) {
        log('info', 'Chat: no messages found');
        return factory.createResponse("No chat messages found");
      }

      let output = `Found ${messages.length} chat message(s):\n\n`;
      messages.forEach((msg, index) => {
        const timestamp = new Date(msg.timestamp).toISOString();
        output += `${index + 1}. ${timestamp} - ${msg.username}: ${msg.content}\n`;
      });
      log('info', `Chat: returned ${messages.length} messages`);

      return factory.createResponse(output);
    }
  );
}
