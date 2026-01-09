import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BotConnection } from './bot-connection.js';
import { log } from './logger.js';

type McpResponse = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
  [key: string]: unknown;
};

export class ToolFactory {
  constructor(
    private server: McpServer,
    private connection: BotConnection
  ) {}

  registerTool(
    name: string,
    description: string,
    schema: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    executor: (args: any) => Promise<McpResponse>
  ): void {
    this.server.tool(name, description, schema, async (args: unknown): Promise<McpResponse> => {
      // Log tool start with arguments
      let argStr = '';
      try { argStr = JSON.stringify(args); } catch { argStr = String(args); }
      log('info', `tool:start ${name} args=${argStr}`);

      const connectionCheck = await this.connection.checkConnectionAndReconnect();

      if (!connectionCheck.connected) {
        log('warn', `tool:blocked ${name} reason=${connectionCheck.message}`);
        return {
          content: [{ type: "text", text: connectionCheck.message! }],
          isError: true
        };
      }

      try {
        const result = await executor(args);
        const status = result.isError ? 'error' : 'ok';
        const text = Array.isArray(result.content) && result.content[0]?.type === 'text'
          ? String((result.content[0] as { text?: string }).text || '')
          : '';
        const compact = text.replace(/\s+/g, ' ').slice(0, 200);
        log('info', `tool:done ${name} status=${status} text="${compact}"`);
        return result;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log('error', `tool:error ${name} message=${msg}`);
        return this.createErrorResponse(error as Error);
      }
    });
  }

  createResponse(text: string): McpResponse {
    return {
      content: [{ type: "text", text }]
    };
  }

  createErrorResponse(error: Error | string): McpResponse {
    const errorMessage = error instanceof Error ? error.message : error;
    return {
      content: [{ type: "text", text: `Failed: ${errorMessage}` }],
      isError: true
    };
  }
}
