#!/usr/bin/env node
// feind-vergabe-mcp – Prototyp, Transport stdio (lokal in Claude Code / Cowork).
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

const server = createServer();
await server.connect(new StdioServerTransport());
console.error('feind-vergabe-mcp läuft (stdio, nur lesend).');
