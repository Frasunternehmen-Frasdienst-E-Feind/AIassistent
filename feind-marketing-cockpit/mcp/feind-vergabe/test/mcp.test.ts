// Protokolltest: Server über stdio starten, Tools auflisten, Offline-Tool aufrufen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('MCP: Tools gelistet, alle nur lesend, prepare antwortet strukturiert', async () => {
  const client = new Client({ name: 'test', version: '1' });
  await client.connect(new StdioClientTransport({ command: 'node', args: [new URL('../src/index.js', import.meta.url).pathname] }));
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(t => t.name).sort(), ['vergabe_fetch_bund', 'vergabe_get_notice', 'vergabe_prepare_tenders', 'vergabe_search_ted', 'vergabe_source_status']);
  assert.ok(tools.every(t => t.annotations?.readOnlyHint === true && t.annotations?.destructiveHint === false));
  const r = await client.callTool({ name: 'vergabe_prepare_tenders', arguments: { notices: [] } });
  assert.deepEqual((r.structuredContent as { neu: unknown[] }).neu, []);
  const s = await client.callTool({ name: 'vergabe_source_status', arguments: {} });
  assert.match((s.content as { text: string }[])[0].text, /noch nicht abgefragt/);
  await client.close();
});
