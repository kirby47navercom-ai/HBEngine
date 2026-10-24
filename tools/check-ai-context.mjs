import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {performance} from 'node:perf_hooks';
import {engineContext, contextArgs} from './ai-context.mjs';
import {schemaSection} from './hb.mjs';

const root = path.resolve(import.meta.dirname, '..'), exec = promisify(execFile), measurements = [];
const routes = JSON.parse(await fs.readFile(path.join(root, 'docs/ai-routes.json'), 'utf8'));
assert.equal(new Set(routes.topics.map(topic => topic.id)).size, routes.topics.length);
for (const topic of routes.topics) {
  assert.ok(topic.label && topic.keywords.length && topic.areas.length && topic.paths.length);
  for (const file of topic.paths) {
    assert.ok(!path.isAbsolute(file) && !file.includes('..'));
    assert.equal((await fs.lstat(path.join(root, file))).isFile(), true, file);
  }
}
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'hb-ai-context-'));
async function cli(label, tool, args = [], cwd = root) {
  const start = performance.now();
  const {stdout, stderr} = await exec(process.execPath, [path.join(root, tool), ...args], {cwd, windowsHide: true, timeout: 15000, maxBuffer: 512 * 1024});
  assert.equal(stderr, '');
  measurements.push({label, processMs: +(performance.now() - start).toFixed(2), outputBytes: Buffer.byteLength(stdout)});
  return JSON.parse(stdout);
}
let server;
try {
  const initial = await cli('offline bootstrap from unrelated CWD', 'tools/hb.mjs', ['context'], scratch);
  assert.equal(initial.root.replaceAll('\\', '/').replace(/\/$/, ''), root.replaceAll('\\', '/'));
  assert.equal(initial.readOnly, true);
  assert.equal(initial.topics.length, routes.topics.length);
  assert.ok(initial.state.latestInstallation.receipt);
  assert.equal(initial.files, undefined);
  assert.ok(measurements.at(-1).outputBytes < 14000);
  const blueprint = await cli('Korean blueprint task', 'tools/hb.mjs', ['context', '블루프린트 변수 드래그']);
  assert.ok(blueprint.selectedTopics.some(topic => topic.id === 'blueprint'));
  assert.ok(blueprint.files.some(file => file.path === 'prototype/blueprint-runtime.js'));
  assert.ok(blueprint.checkCandidates.length);
  assert.ok(blueprint.files.length <= 8);
  assert.ok(measurements.at(-1).outputBytes < 20000);
  const twoD = await cli('2D task', 'tools/ai-context.mjs', ['2D 스프라이트 입력']);
  assert.ok(twoD.selectedTopics.some(topic => topic.id === '2d'));
  assert.ok(twoD.files.some(file => /sprite|two-d/.test(file.path)));
  const exact = await cli('exact ledger ID', 'tools/hb.mjs', ['context', 'RND-06']);
  assert.equal(exact.ledger.length, 1);
  assert.equal(exact.ledger[0].id, 'RND-06');
  const symbol = await cli('literal source lookup', 'tools/hb.mjs', ['context', 'lighting', '--symbol', 'reflectionProbeMeshBounds', '--limit', '4']);
  assert.ok(symbol.symbolSearch.matches.length);
  assert.ok(symbol.symbolSearch.matches.length <= 4);
  for (const hit of symbol.symbolSearch.matches) {
    const source = await fs.readFile(path.join(root, hit.path), 'utf8');
    const line = source.split('\n')[hit.line - 1];
    assert.equal(line.slice(hit.column - 1, hit.column - 1 + 'reflectionProbeMeshBounds'.length), 'reflectionProbeMeshBounds');
    assert.ok(hit.excerpt.length <= 260);
    assert.ok(!hit.path.startsWith('tools/check-'));
  }
  const unknown = await cli('unknown task bounded output', 'tools/hb.mjs', ['context', 'unfindable-xyz987654']);
  assert.match(unknown.lookup, /^no-match/);
  assert.deepEqual(unknown.files, []);
  for (const literal of ['prepareFbxIdentifiers', 'editMixerBus', 'collisionShortcut']) {
    const focused = await engineContext({task:'unfindable-xyz987654',symbol:literal,limit:4});
    assert.equal(focused.lookup,'matched','a successful symbol route must not report an unknown task');
    assert.equal(focused.symbolSearch.mode,'focused-routes');
    assert.equal(focused.symbolSearch.filesRead,1);
    assert.ok(focused.symbolSearch.matches.length);
  }
  const missing = await cli('absent literal', 'tools/hb.mjs', ['context', '--symbol', 'NoSuchSymbol_xq987654321', '--limit', '1']);
  assert.deepEqual(missing.symbolSearch.matches, []);
  for (const bad of [null, [], {task: 4}, {symbol: 'a\nb'}, {task: 'a'.repeat(501)}, {limit: 0}, {limit: 13}, {path: '../../'}]) await assert.rejects(() => engineContext(bad));
  assert.deepEqual(contextArgs(['블루프린트', '입력', '--limit', '2']), {task: '블루프린트 입력', symbol: '', limit: 2});
  for (const args of [['--task'], ['--symbol', '--limit'], ['--limit', 'NaN'], ['--unknown'], ['task', '--task', 'other']]) assert.throws(() => contextArgs(args));
  await assert.rejects(() => cli('invalid CLI', 'tools/hb.mjs', ['context', '--unknown']));
  await assert.rejects(() => cli('missing schema section', 'tools/hb.mjs', ['schema', '--section']));
  const sample = {blueprint: {nodes: [{key: 'start', inputs: []}]}, limits: {zero: 0, no: false, absent: null}, commands: {read: {params: []}}};
  assert.equal(schemaSection(sample), sample);
  for (const key of ['zero', 'no', 'absent']) assert.equal(schemaSection(sample, 'limits.' + key).value, sample.limits[key]);
  for (const key of ['', 'missing', 'blueprint.missing', '__proto__', 'constructor', 'blueprint..nodes']) assert.throws(() => schemaSection(sample, key));
  let requests = 0;
  server = http.createServer((request, response) => {
    assert.equal(request.method, 'GET'); assert.equal(request.url, '/api/schema'); requests++;
    response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(sample));
  });
  let address;
  // Windows can allocate an HTTP port forbidden by fetch (for example 6679).
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    address = 'http://127.0.0.1:' + server.address().port;
    try { await (await fetch(address + '/api/schema')).json(); break; }
    catch (error) { await new Promise(resolve => server.close(resolve)); if (attempt === 7) throw error; }
  }
  requests = 0;
  const section = await cli('selected live schema via isolated HTTP stub', 'tools/hb.mjs', ['schema', '--section', 'blueprint.nodes', '--url', address]);
  assert.deepEqual(section, {section: 'blueprint.nodes', value: sample.blueprint.nodes});
  assert.equal(section.commands, undefined);
  assert.deepEqual(await cli('legacy full schema unchanged', 'tools/hb.mjs', ['schema', '--url', address]), sample);
  await assert.rejects(() => cli('unknown section error', 'tools/hb.mjs', ['schema', '--section', 'missing', '--url', address]));
  assert.equal(requests, 3);
  const bytes = {};
  for (const file of ['AGENTS.md', 'docs/AI_START.md', 'CODEX_HANDOFF.md', 'docs/archive/CODEX_HANDOFF_THROUGH_1049.md', 'docs/AI_ENGINE_API.md', 'docs/ENGINE_STATUS.md']) bytes[file] = (await fs.stat(path.join(root, file))).size;
  assert.ok(bytes['CODEX_HANDOFF.md'] < 5000);
  const report = {version: 1, passed: true, date: new Date().toISOString(), topics: routes.topics.length, measurements, documentBytes: bytes,
    scope: '오프라인 CLI/한글·ID·심볼/무관 CWD/범위·오류/스키마 선택과 기존 전체 응답. 스키마는 격리 HTTP stub이며 실제 편집기 실행 검사가 아니에요.',
    limits: ['처리 시간은 이 PC의 관찰이며 모델의 이해 시간·정답률을 측정하지 않아요.', '사용자 설치본/렌더링/모바일/실제 AI 클라이언트 세션은 실행하지 않아요.']};
  await fs.mkdir(path.join(root, 'native/build'), {recursive: true});
  await fs.writeFile(path.join(root, 'native/build/ai-context-1058.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await fs.rm(scratch, {recursive: true, force: true});
}
