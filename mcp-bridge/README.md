Minimal MCP bridge for LM Studio

This small bridge is a lightweight MCP client wrapper that spawns the real server process
and proxies stdio between LM Studio (or another MCP-capable client) and the server.

Usage (LM Studio should launch this as the MCP client):

Example `mcpServers` JSON entry for LM Studio:

```
{
  "mcpServers": {
    "minecraft": {
      "command": "node",
      "args": [
        "/home/jeremy/Documents/minecraft-mcp-server/mcp-bridge/src/index.js",
        "--server-cmd",
        "npx",
        "--server-args",
        "-y,github:yuniko-software/minecraft-mcp-server,--host,localhost,--port,26565,--username,AnythingBot"
      ]
    }
  }
}
```

Manual run (local testing):

```bash
node mcp-bridge/src/index.js --server-cmd npx --server-args "-y,github:yuniko-software/minecraft-mcp-server,--host,localhost,--port,26565,--username,AnythingBot"
```

Notes:
- The bridge only proxies stdio; it does not implement any model adapters by default.
- Ensure `node` and `npx` are available to whatever environment runs the bridge.
