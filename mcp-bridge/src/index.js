#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { spawn } from 'node:child_process';

const argv = yargs(hideBin(process.argv))
  .option('server-cmd', { type: 'string', default: 'npx' })
  .option('server-args', { type: 'string', default: '-y,github:yuniko-software/minecraft-mcp-server,--host,localhost,--port,26565,--username,AnythingBot' })
  .option('unique-username', { type: 'boolean', default: false, description: 'Append PID to username to avoid duplicate-login issues' })
  .option('fallback-terminator', { type: 'boolean', default: false, description: 'If true, bridge emits a fallback DONE when model omits it' })
  .help()
  .parseSync();

let serverArgs = argv['server-args'].split(',').filter(Boolean);
// Enable diagnostics when the server is started with --anything-llm
const warnOnNonJson = serverArgs.includes('--anything-llm');

// If requested, make the username unique by appending a safe suffix using an underscore
if (argv['unique-username']) {
  const usernameIdx = serverArgs.findIndex((v, i) => v === '--username' && i + 1 < serverArgs.length);
  const makeSafe = (s) => String(s).replace(/[^A-Za-z0-9_]/g, '_');
  const suffix = '_' + String(process.pid).slice(-5); // keep suffix short
  const MAX_USERNAME_LENGTH = 16;

  if (usernameIdx !== -1) {
    let base = String(serverArgs[usernameIdx + 1] || 'AnythingBot');
    base = makeSafe(base);
    const maxBase = Math.max(1, MAX_USERNAME_LENGTH - suffix.length);
    if (base.length > maxBase) base = base.slice(0, maxBase);
    serverArgs[usernameIdx + 1] = base + suffix;
  } else {
    // append username if not present
    let base = 'AnythingBot';
    base = makeSafe(base);
    const maxBase = Math.max(1, MAX_USERNAME_LENGTH - suffix.length);
    if (base.length > maxBase) base = base.slice(0, maxBase);
    serverArgs.push('--username', base + suffix);
  }
}

process.stderr.write('Spawning MCP server process: ' + argv['server-cmd'] + ' ' + serverArgs.join(' ') + '\n');

const child = spawn(argv['server-cmd'], serverArgs, {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: process.env,
  shell: false
});

// Keep piping for normal behavior, but also log the raw exchanges with timestamps
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

// Replace raw piping from stdin -> child with a tolerant parser that will
// extract the first valid JSON object or a DONE marker from incoming chunks.
let stdinBuffer = '';

function extractFirstJsonOrDone(text) {
  // Check for DONE anywhere (model may emit it separately)
  if (/\bDONE\b/.test(text)) return { type: 'done', raw: 'DONE' };

  const start = text.indexOf('{');
  if (start === -1) return null;

  // Try progressively larger substrings to find a valid JSON object
  // Limit the max length to avoid excessive CPU on huge garbage.
  const maxLen = Math.min(text.length, start + 10000);
  for (let end = start + 1; end <= maxLen; end++) {
    const substr = text.slice(start, end);
    try {
      const obj = JSON.parse(substr);
      return { type: 'json', value: obj, raw: substr, start, end };
    } catch (e) {
      // not valid yet — continue
    }
  }
  return null;
}

process.stdin.on('data', (chunk) => {
  try {
    logExchange('STDIN -> CHILD', chunk);
    stdinBuffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');

    // Keep extracting and forwarding any complete JSON objects found.
    let progress = true;
    let forwarded = false;
    while (progress) {
      progress = false;
      const found = extractFirstJsonOrDone(stdinBuffer);
      if (!found) break;
          if (found.type === 'done') {
            // Strip DONE markers from input and do not forward them to the child.
            const idx = stdinBuffer.search(/\bDONE\b/);
            if (idx !== -1) {
              // Remove the token and continue parsing
              stdinBuffer = stdinBuffer.slice(0, idx) + stdinBuffer.slice(idx + 4);
              progress = true;
            }
          } else if (found.type === 'json') {
        // Forward the first valid JSON substring to the child, followed by newline.
        const { start, end } = found;
        let raw = stdinBuffer.slice(start, end);
        // Tolerant rewrite: accept tool names prefixed by the client (e.g.
        // "minecraft-via-bridge-move-to-position") and rewrite them to the
        // plain registered tool names (e.g. "move-to-position") so the
        // server will recognize them.
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.name === 'string') {
            // strip common prefixes up to the last hyphen
            const m = parsed.name.match(/([^-]+-)*([^-]+)$/);
            if (m && m[2]) parsed.name = m[2];
          }
          raw = JSON.stringify(parsed);
        } catch (e) {
          // if parse fails, fall back to sending the original raw string
        }
        try { child.stdin.write(raw + '\n'); } catch (e) {}
        forwarded = true;
        // Do not emit any DONE/done/success markers here — remove bridge-side
        // terminators to match the new protocol (model must not rely on DONE).
        // Remove what we consumed from the buffer
        stdinBuffer = stdinBuffer.slice(end);
        progress = true;
      }
    }
    // Prevent the buffer from growing indefinitely
    if (stdinBuffer.length > 20000) stdinBuffer = stdinBuffer.slice(-20000);

    // If diagnostics are enabled and nothing was forwarded from this chunk,
    // emit a single-line warning when the input appears to be non-JSON prose.
    if (warnOnNonJson && !forwarded) {
      try {
        const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
        const trimmed = text.trim();
        const looksLikeProse = trimmed && !/[{]/.test(trimmed) && !/\bDONE\b/i.test(trimmed);
        if (looksLikeProse) {
          const ts = new Date().toISOString();
          const preview = trimmed.replace(/\s+/g, ' ').slice(0, 120);
          process.stderr.write(`${ts} [bridge] [warn] Non-JSON input received; likely drift. Ignoring. Preview: ${preview}\n`);
        }
      } catch (e) {
        // ignore diagnostics errors
      }
    }
  } catch (e) {
    // logging only — don't crash
    console.error('Error parsing stdin buffer:', e);
  }
});

const logExchange = (prefix, chunk) => {
  try {
    const ts = new Date().toISOString();
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    // sanitize newlines for single-line log entries
    const single = text.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
    process.stderr.write(`${ts} [bridge] ${prefix} (${Buffer.byteLength(chunk)} bytes): ${single}\n`);
  } catch (e) {
    process.stderr.write(new Date().toISOString() + ' [bridge] ' + prefix + ' (unprintable chunk)\n');
  }
};

process.stdin.on('data', (chunk) => logExchange('STDIN -> CHILD', chunk));
child.stdout.on('data', (chunk) => logExchange('CHILD -> STDOUT', chunk));
child.stderr.on('data', (chunk) => logExchange('CHILD -> STDERR', chunk));

// If our stdin is closed (LM Studio or parent disconnected), shut down the child and exit.
process.stdin.on('end', async () => {
  process.stderr.write('Bridge stdin closed — parent disconnected, shutting down child\n');
  try { process.stdin.unpipe(child.stdin); } catch (e) {}
  try { child.stdin.end(); } catch (e) {}
  const exited = await new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 3000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve(true);
    });
  });
  if (!exited) {
    try { child.kill('SIGTERM'); } catch (e) {}
    setTimeout(() => process.exit(0), 500);
  } else {
    process.exit(0);
  }
});

child.on('exit', (code, signal) => {
  process.stderr.write(`MCP server child exited with code=${code} signal=${signal}\n`);
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('Failed to spawn MCP server child:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  process.stderr.write('Bridge received SIGINT — attempting graceful shutdown\n');
  // First, politely ask the child to terminate so the server can clean up the session.
  try { child.kill('SIGINT'); } catch (e) {}
  try { process.stdin.unpipe(child.stdin); } catch (e) {}
  try { child.stdin.end(); } catch (e) {}

  const exited = await new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 5000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve(true);
    });
  });

  if (!exited) {
    process.stderr.write('Child did not exit in time — sending SIGTERM\n');
    try { child.kill('SIGTERM'); } catch (e) {}
    setTimeout(() => process.exit(130), 1000);
    } else {
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  process.stderr.write('Bridge received SIGTERM — attempting graceful shutdown\n');
  try { process.stdin.unpipe(child.stdin); } catch (e) {}
  try { child.stdin.end(); } catch (e) {}
  setTimeout(() => {
    try { child.kill('SIGTERM'); } catch (e) {}
    process.exit(0);
  }, 2000);
});

process.on('exit', () => {
  try {
    if (!child.killed) child.kill('SIGTERM');
  } catch (e) {}
});
