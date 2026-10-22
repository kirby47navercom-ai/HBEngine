import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {readEngineStatus} from './engine-status.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function contextInstallation(directory=root){
  const file=path.join(directory,'HBEngine.install.json');
  try{
    const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16*1024*1024)return {observed:false,error:'설치 마커 형식·크기 오류'};
    const marker=JSON.parse(await fs.readFile(file,'utf8'));
    if(marker.version!==1||!/^\w{64}$/.test(marker.bundleHash)||!/^[a-f0-9]+$/i.test(marker.bundleHash)||!Array.isArray(marker.files)||typeof marker.installedAt!=='string')return {observed:false,error:'설치 마커 필드 오류'};
    return {observed:true,root:path.resolve(directory),marker:'HBEngine.install.json',bundleHash:marker.bundleHash,installedAt:marker.installedAt,manifestFiles:marker.files.length,integrityChecked:false};
  }catch(error){return error.code==='ENOENT'?null:{observed:false,error:'설치 마커 읽기 오류'};}
}
const codeRoots = ['prototype', 'tools', 'native/include/HBEngine', 'native/desktop', 'native/mobile'];
const excluded = new Set(['build', 'dist', 'node_modules', 'screenshots', '.git', 'examples']);
const generated = new Set(['native/include/HBEngine/RayPrograms.hpp', 'native/include/HBEngine/ScreenEffects.hpp', 'prototype/core-api.js']);
const codeExtension = /\.(?:[cm]?js|[ch]pp|h|mm|java|kt|css|html)$/;
const clip = (text, length = 240) => text.length > length ? text.slice(0, length) + '…' : text;
const normalize = value => value.normalize('NFKC').toLowerCase();
const words = text => normalize(text).split(/[^\p{L}\p{N}_+.-]+/u).filter(Boolean);
function hasTerm(text, term) {
  if (/^[a-z0-9]{1,3}$/.test(term)) return words(text).includes(term);
  return normalize(text).includes(normalize(term));
}
function optionsFor(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some(key => !['task', 'symbol', 'limit', 'all'].includes(key))) throw Error('context는 task, symbol, limit, all만 받아요.');
  const {task = '', symbol = '', limit = 8, all = false} = options;
  if (typeof all !== 'boolean' || typeof task !== 'string' || task.length > 500 || typeof symbol !== 'string' || symbol.length > 160 || /[\r\n\0]/.test(task + symbol) || !Number.isSafeInteger(limit) || limit < 1 || limit > 12) throw Error('task 500자·symbol 160자 이하, limit 정수 1~12를 사용하세요.');
  return {task: task.trim(), symbol: symbol.trim(), limit, ...(all ? {all:true} : {})};
}
async function inventory(directory, prefix = directory) {
  let entries;
  try { entries = await fs.readdir(path.join(root, directory), {withFileTypes: true}); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (entry.isSymbolicLink() || excluded.has(entry.name)) continue;
    const name = prefix + '/' + entry.name;
    if (entry.isDirectory()) files.push(...await inventory(name));
    else if (entry.isFile() && codeExtension.test(name) && !generated.has(name)) files.push(name);
  }
  return files;
}
function gitState() {
  const git = args => execFileSync('git', ['-C', root, ...args], {encoding: 'utf8', windowsHide: true, timeout: 1500, maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});
  try {
    if (path.resolve(git(['rev-parse', '--show-toplevel']).trim()) !== path.resolve(root)) return {available: false};
    const head = git(['rev-parse', 'HEAD']).trim();
    const changes = git(['status', '--porcelain=v1', '-z', '--untracked-files=all']).split('\0').filter(Boolean);
    const dirty = [];
    for (let i = 0; i < changes.length; i++) {
      const entry = changes[i], status = entry.slice(0, 2);
      const item = {status, path: entry.slice(3)};
      if (/[RC]/.test(status)) item.from = changes[++i];
      dirty.push(item);
    }
    return {available: true, head, dirtyCount: dirty.length, dirty: dirty.slice(0, 20), omitted: Math.max(0, dirty.length - 20)};
  } catch { return {available: false, note: '설치본 또는 Git 조회 불가. 로컬 원장·파일로 탐색해요.'}; }
}
async function fileInfo(file) {
  const stat = await fs.lstat(path.join(root, file));
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error('일반 소스 파일이 아니에요: ' + file);
  return {path: file, bytes: stat.size};
}
async function findSymbol(files, symbol, limit) {
  const matches = [], skipped = [];
  let filesRead = 0, bytesRead = 0, truncated = false;
  for (const file of files) {
    const info = await fileInfo(file);
    if (info.bytes > 2 * 1024 * 1024) { skipped.push(file); continue; }
    const source = await fs.readFile(path.join(root, file), 'utf8');
    filesRead++; bytesRead += info.bytes;
    let start = 0, line = 1;
    while (start < source.length) {
      const index = source.indexOf(symbol, start);
      if (index < 0) break;
      for (let i = start; i < index; i++) if (source[i] === '\n') line++;
      const from = Math.max(source.lastIndexOf('\n', index) + 1, index - 90);
      const next = source.indexOf('\n', index);
      const to = Math.min(next < 0 ? source.length : next, index + symbol.length + 130);
      matches.push({path: file, line, column: index - source.lastIndexOf('\n', index), excerpt: source.slice(from, to).trim()});
      if (matches.length >= limit) { truncated = true; break; }
      start = index + symbol.length;
    }
    if (truncated) break;
  }
  return {literal: symbol, caseSensitive: true, matches, filesRead, bytesRead, skippedOversize: skipped, truncated, scope: '엔진 소스만; 검사·예제·생성 헤더·사용자 프로젝트 제외'};
}

export async function engineContext(input = {}) {
  const start = performance.now(), {task, symbol, limit, all = false} = optionsFor(input);
  const [routes, status, installation] = await Promise.all([
    fs.readFile(new URL('../docs/ai-routes.json', import.meta.url), 'utf8').then(JSON.parse),
    readEngineStatus(),contextInstallation()
  ]);
  const base = {
    version: 1, readOnly: true, root, task, symbol,
    start: ['AGENTS.md', 'docs/AI_START.md', 'CODEX_HANDOFF.md'],
    architecture: {
      editor: 'prototype/app.js → 에셋별 편집기·문서/revision/Undo',
      game: 'prototype/player.js → play-world.js → blueprint-runtime.js/engine-services.js',
      cpp: 'Game.hpp/Library.hpp 공개 선언 → generate-api.mjs → BP 노드; NativeHost/Bridge → 같은 실행 서비스',
      rendering: 'game-renderer.js → WebGL2/WebGPU 또는 native-scene-renderer.js → SceneRenderBridge.hpp → DX11',
      authoring: '기존 JSON 에셋·schema·document.patch/transaction 공유. 사용자 데이터와 검사 fixture 격리'
    },
    git: gitState(),
    state: {file: 'docs/research/ENGINE_STATUS.json', updatedAt: status.updatedAt, basisRevision: status.basisRevision,
      latestBatch: status.latestBatch, latestInstallation: status.latestInstallation, installation,
      warning: '원장은 확정 기록이에요. 미커밋 변경은 Git/인계와 따로 대조해요. 전체 UE/Unity 완료율이 아니에요.'},
    boundaries: ['처음부터 README/AI_ENGINE_API/과거 연구·인계 전체를 읽지 말고 작업 관련 원문만 확장해요.',
      '오프라인 조회는 창·서버·네트워크·컴파일·패키징·사용자 프로젝트를 열지 않아요.',
      '검사 후보는 실행 완료가 아니에요. 수정 여러 개를 묶은 뒤 필요한 검사만 한 번 실행해요.'],
    topics: routes.topics.map(({id, label}) => ({id, label}))
  };
  if (task || symbol) {
    const allFiles = (await Promise.all(codeRoots.map(directory => inventory(directory)))).flat();
    const sourceFiles = allFiles.filter(file => !file.startsWith('tools/check-') && !file.startsWith('tools/fixtures/') && !file.includes('/tests/'));
    const tokens = words(task + ' ' + symbol).filter(token => token.length > 1);
    const ranked = routes.topics.map(topic => ({...topic, score: (task === topic.id ? 30 : 0) + topic.keywords.reduce((n, keyword) => n + (hasTerm(task + ' ' + symbol, keyword) ? Math.min(keyword.length, 12) : 0), 0)})).filter(topic => topic.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const selected = ranked.slice(0, 3), areas = new Set(selected.flatMap(topic => topic.areas));
    const fileScore = file => tokens.reduce((n, token) => n + (hasTerm(file, token) ? token.length : 0), 0);
    const fileHits = sourceFiles.map(file => ({file, score: fileScore(file)})).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
    const exact = status.items.filter(item => tokens.includes(normalize(item.id)));
    const items = (exact.length ? exact : status.items.filter(item => areas.has(item.area))).map(item => ({item, score: fileScore(item.title) + item.sources.reduce((n, file) => n + fileScore(file), 0)})).sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id)).slice(0, 4).map(({item}) => item);
    const exactSymbolRoutes=symbol?(routes.focusRoutes||[]).filter(route=>route.keywords.includes(symbol)):[];
    const focusedPaths=(exactSymbolRoutes.length?exactSymbolRoutes:(routes.focusRoutes||[]).filter(route=>route.keywords.some(keyword=>hasTerm(task+' '+symbol,keyword)))).flatMap(route=>route.paths);
    const candidates = [...new Set([...fileHits.slice(0, 3).map(item => item.file), ...focusedPaths, ...selected.flatMap(topic => topic.paths), ...items.flatMap(item => item.sources)])];
    const files = [];
    for (const file of candidates) {
      if (files.length >= limit) break;
      try { files.push(await fileInfo(file)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    base.selectedTopics = selected.map(({id, label}) => ({id, label}));
    base.files = files;
    base.ledger = items.map(item => ({id: item.id, title: item.title, status: item.status, remaining: item.remaining.slice(0, 2).map(text => clip(text)), omittedRemaining: Math.max(0, item.remaining.length - 2), latestEvidence: item.evidence.slice(-2)}));
    base.checkCandidates = allFiles.filter(file => file.startsWith('tools/check-')).map(file => ({file, score: fileScore(file) + selected.reduce((n, topic) => n + (hasTerm(file, topic.id) ? 4 : 0), 0)})).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.file.localeCompare(b.file)).slice(0, 5).map(({file}) => file);
    base.lookup = selected.length || fileHits.length || exact.length ? 'matched' : 'no-match: 분야 ID 또는 정확한 파일명/symbol로 좁혀요.';
    if (symbol) {
      const searchFiles = [...new Set([...files.map(info => info.path).filter(file => sourceFiles.includes(file)), ...sourceFiles])];
      const focused = [...new Set(focusedPaths)].filter(file => sourceFiles.includes(file));
      const initial = !all && focused.length ? await findSymbol(focused, symbol, limit) : null;
      if (initial?.matches.length) {
        base.symbolSearch = {...initial, mode:'focused-routes', routeFiles:focused,
          scope:initial.scope+'; 일치한 focusRoutes만 조회, 다른 호출처는 --all로 확장',
          expand:{all:true, cli:'node tools/hb.mjs context '+JSON.stringify(task)+' --symbol '+JSON.stringify(symbol)+' --all'}};
      } else {
        const rest = await findSymbol(initial ? searchFiles.filter(file => !focused.includes(file)) : searchFiles, symbol, limit);
        base.symbolSearch = {...rest, mode:all?'all':'fallback-all',
          filesRead:rest.filesRead+(initial?.filesRead||0), bytesRead:rest.bytesRead+(initial?.bytesRead||0),
          skippedOversize:[...(initial?.skippedOversize||[]),...rest.skippedOversize]};
      }
    }
  }
  base.elapsedMs = Math.round((performance.now() - start) * 100) / 100;
  return base;
}

export function contextArgs(args) {
  const params = {}, positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (['--task', '--symbol', '--limit'].includes(arg)) {
      const value = args[++i];
      if (value === undefined || value.startsWith('--')) throw Error(arg + ' 값이 필요해요.');
      params[arg.slice(2)] = arg === '--limit' ? Number(value) : value;
    } else if (arg === '--all') params.all = true;
    else if (arg.startsWith('--')) throw Error('알 수 없는 context 옵션: ' + arg);
    else positional.push(arg);
  }
  if (positional.length && params.task !== undefined) throw Error('작업명과 --task 중 하나만 사용하세요.');
  if (positional.length) params.task = positional.join(' ');
  return optionsFor(params);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await engineContext(contextArgs(process.argv.slice(2))), null, 2)); }
  catch (error) { console.error(JSON.stringify({error: error.message, code: 'CONTEXT_FAILED'})); process.exitCode = 1; }
}
