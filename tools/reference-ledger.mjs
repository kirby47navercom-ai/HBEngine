import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Research evidence only. Nothing in this tool implements or launches the engine.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
function option(name, fallback) {
  const at = argv.indexOf(name);
  if (at < 0) return fallback;
  const value = argv[at + 1];
  if (!value) throw new Error(`Missing ${name}`);
  argv.splice(at, 2);
  return path.resolve(value);
}
const stateDir = option('--state-dir', path.join(repo, 'native/build/reference-corpus'));
const manifestFile = option('--manifest', path.join(repo, 'docs/research/CORPUS_MANIFEST.json'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const full = file => path.resolve(repo, file);
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const manifest = read(manifestFile);
requireThat(manifest.schemaVersion === 1 && manifest.phase === 'research_only', 'Expected research_only manifest v1');
const sources = new Map(manifest.sources.map(source => [source.id, source]));
requireThat(sources.size > 0 && sources.size === manifest.sources.length, 'Nonempty unique source roots required');
const baselineHash = source => hash(JSON.stringify({ id: source.id, engine: source.engine, version: source.version, locale: source.locale, roots: source.roots, hosts: source.hosts, pathPrefix: source.pathPrefix }));
const ledgerFile = path.join(stateDir, 'ledger.json');
const ledger = fs.existsSync(ledgerFile) ? read(ledgerFile) : { schemaVersion: 1, pages: {}, imports: [] };
function save() {
  fs.mkdirSync(stateDir, { recursive: true });
  const temp = `${ledgerFile}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.renameSync(temp, ledgerFile);
}
const proofCache = new Map();
function fileProof(file, expectedHash) {
  requireThat(nonempty(file), 'Missing evidence file');
  const key = full(file);
  let actual = proofCache.get(key);
  if (!actual) { actual = hash(fs.readFileSync(key)); proofCache.set(key, actual); }
  if (expectedHash) requireThat(actual === expectedHash, `Evidence hash mismatch: ${file}`);
  return { file, sha256: actual };
}
function pinnedProof(proof) {
  requireThat(proof && /^[a-f0-9]{64}$/.test(proof.sha256 || ''), 'Missing pinned SHA-256 evidence');
  return fileProof(proof.file, proof.sha256);
}
function canonical(source, input) {
  const url = new URL(input);
  requireThat(url.protocol === 'https:' && source.hosts.includes(url.hostname), `Unofficial URL: ${input}`);
  requireThat(!source.pathPrefix || url.pathname.startsWith(source.pathPrefix), `URL outside source: ${input}`);
  if (source.engine === 'Unreal') {
    const supplied = url.searchParams.get('application_version');
    requireThat(!supplied || supplied === source.version, `Wrong version: ${input}`);
    url.searchParams.set('application_version', source.version);
  }
  if (source.id === 'unity-packages') requireThat(/\/Packages\/[^/]+@\d+(?:\.\d+){1,2}(?:-[a-zA-Z0-9.-]+)?\//.test(`${url.pathname}/`), 'Package version must be pinned; latest/current aliases need resolution');
  url.hash = '';
  return url.href;
}
function discoveryUrl(source, input) {
  const url = new URL(input);
  requireThat(url.protocol === 'https:' && source.hosts.includes(url.hostname), 'Unofficial discovery source');
  const version = url.searchParams.get('application_version');
  requireThat(source.engine !== 'Unreal' || !version || version === source.version, 'Wrong discovery version');
  return url.href;
}
function pageById(id) {
  const page = ledger.pages[id];
  requireThat(page, `Unknown page ${id}`);
  return page;
}
function snapshot(page) {
  requireThat(page.snapshot, 'No body snapshot; discovered is not fetched');
  const value = page.snapshot;
  const source = sources.get(page.sourceId);
  requireThat(value.baselineHash === baselineHash(source), 'Source roots/locale/baseline changed; snapshot needs revalidation');
  requireThat(value.version === source.version && value.canonicalUrl === page.url && canonical(source, page.url) === page.url, 'Snapshot no longer matches the baseline version/URL');
  pinnedProof(value.source);
  pinnedProof(value.body);
  return value;
}
function reportProof(page, kind) {
  const proof = page[kind];
  requireThat(proof, `Missing ${kind} evidence`);
  pinnedProof(proof);
  return read(full(proof.file));
}
function coverage(got, expected, label) {
  requireThat(Array.isArray(got), `Missing ${label} coverage`);
  requireThat(new Set(got).size === got.length, `Duplicate ${label} coverage`);
  const wanted = new Set(expected);
  requireThat(got.length === wanted.size && got.every(id => wanted.has(id)), `Incomplete ${label} coverage`);
}
function evidenceArtifactsValid(report, active = new Set()) {
  const artifacts = report.evidenceArtifacts ?? [];
  requireThat(Array.isArray(artifacts), 'Evidence artifacts must be an array');
  const normalized = value => value.replaceAll('\\', '/');
  const identity = file => process.platform === 'win32' ? full(file).toLowerCase() : full(file);
  const declared = new Map();
  for (const proof of artifacts) {
    pinnedProof(proof);
    const key = identity(proof.file);
    requireThat(!declared.has(key), 'Duplicate evidence artifact');
    requireThat(!active.has(key), 'Cyclic evidence artifact');
    declared.set(key, proof);
    if (path.extname(proof.file).toLowerCase() === '.json') {
      const nested = read(full(proof.file));
      requireThat(nested && typeof nested === 'object', 'Invalid JSON evidence artifact');
      evidenceArtifactsValid(nested, new Set([...active, key]));
    }
  }
  const texts = [report.readEvidence, report.comparisonEvidence,
    ...(report.analysis?.sections || []).map(item => item.evidence),
    ...(report.analysis?.apiUnits || []).map(item => item.evidence)].filter(nonempty).map(normalized);
  for (const text of texts) {
    for (const match of text.matchAll(/docs\/research\/[A-Za-z0-9_./-]+\.md(?:\:\d+)?/g)) {
      const reference = match[0].replace(/\:\d+$/, '');
      // Relative references are repo-relative. A full explicit artifact path
      // may also be used, including isolated test or external research caches.
      const proof = declared.get(identity(reference)) || artifacts.find(item => {
        const file = normalized(item.file);
        return path.isAbsolute(item.file) && file.endsWith(`/${reference}`) && text.includes(file);
      });
      requireThat(proof, `Missing pinned referenced artifact: ${reference}`);
    }
  }
}
function boundReport(page, report) {
  const value = snapshot(page);
  requireThat(report.pageId === page.id && report.bodyHash === value.body.sha256 && report.sourceHash === value.source.sha256, 'Report is for another snapshot/page');
  requireThat(nonempty(report.actor) && nonempty(report.date), 'Named actor and date required');
  evidenceArtifactsValid(report);
  return value;
}
function reviewValid(page, report) {
  const value = boundReport(page, report);
  requireThat(value.inventory.complete === true && value.inventory.openIssues.length === 0, 'Body/API/media inventory is incomplete');
  coverage(report.sections, value.inventory.sections, 'section');
  coverage(report.apiUnits, value.inventory.apiUnits, 'API/overload');
  coverage(report.media, value.inventory.media, 'media/table/tab');
  requireThat(report.readScope === 'entire_body' && nonempty(report.readEvidence), 'Entire body must actually be read');
}
function analysisValid(page, report) {
  const review = reportProof(page, 'review');
  reviewValid(page, review);
  const value = boundReport(page, report);
  requireThat(report.actor === review.actor, 'Analysis author must be tied to the body review');
  const analysis = report.analysis;
  requireThat(analysis && Array.isArray(analysis.sections) && Array.isArray(analysis.apiUnits), 'Missing substantive analysis');
  coverage(analysis.sections.map(item => item.id), value.inventory.sections, 'analyzed section');
  coverage(analysis.apiUnits.map(item => item.id), value.inventory.apiUnits, 'analyzed API/overload');
  for (const item of [...analysis.sections, ...analysis.apiUnits]) {
    requireThat(nonempty(item.evidence) && nonempty(item.finding) && nonempty(item.hbDecision), `Missing source-specific analysis ${item.id}`);
  }
  for (const dimension of ['editor', 'runtime', 'cppBlueprint', 'humanAi', 'dependencies', 'limitations']) {
    requireThat(nonempty(analysis[dimension]), `Missing ${dimension} analysis or justified not_applicable`);
  }
  requireThat(Array.isArray(report.openIssues), 'Explicit unresolved issue inventory required');
}
function verifyValid(page, report) {
  const analysis = reportProof(page, 'analysis');
  analysisValid(page, analysis);
  const value = boundReport(page, report);
  requireThat(report.actor !== analysis.actor && report.actor !== reportProof(page, 'review').actor, 'Independent verifier required');
  requireThat(report.analysisHash === page.analysis.sha256, 'Wrong analysis hash');
  coverage(report.sections, value.inventory.sections, 'verified section');
  coverage(report.apiUnits, value.inventory.apiUnits, 'verified API/overload');
  coverage(report.media, value.inventory.media, 'verified media/table/tab');
  requireThat(nonempty(report.comparisonEvidence), 'Actual source-to-analysis comparison required');
  requireThat(Array.isArray(report.openIssues) && report.openIssues.length === 0 && analysis.openIssues.length === 0, 'Unresolved analysis/verification issues');
}
function status(page) {
  try {
    requireThat(canonical(sources.get(page.sourceId), page.url) === page.url, 'Discovery no longer matches source baseline');
    requireThat(page.discoveredFrom.length > 0, 'Missing official discovery provenance');
    for (const evidence of page.discoveredFrom) pinnedProof(evidence);
    if (!page.snapshot) return { state: 'discovered' };
    snapshot(page);
    if (!page.review) return { state: 'fetched' };
    reviewValid(page, reportProof(page, 'review'));
    if (!page.analysis) return { state: 'body_reviewed' };
    analysisValid(page, reportProof(page, 'analysis'));
    if (!page.verification) return { state: 'analyzed' };
    verifyValid(page, reportProof(page, 'verification'));
    return { state: 'verified' };
  } catch (error) {
    return { state: 'stale_or_invalid', issue: error.message };
  }
}
function capture(page, value) {
  requireThat(value.httpStatus === 200 && value.actualBody === true && nonempty(value.bodyMethod), 'HTTP success alone is not an actual document body');
  requireThat(value.version === sources.get(page.sourceId).version && nonempty(value.versionEvidence), 'Actual body version evidence required');
  requireThat(value.canonicalUrl === page.url, 'Snapshot URL mismatch');
  const inventory = value.inventory;
  requireThat(inventory && ['sections', 'apiUnits', 'media', 'openIssues'].every(key => Array.isArray(inventory[key])), 'Explicit body/API/media inventory required');
  requireThat(inventory.sections.length > 0, 'No body sections');
  for (const key of ['sections', 'apiUnits', 'media']) {
    requireThat(inventory[key].every(nonempty), `Empty inventory ID: ${key}`);
    requireThat(new Set(inventory[key]).size === inventory[key].length, `Duplicate inventory ${key}`);
  }
  requireThat(typeof inventory.complete === 'boolean' && nonempty(inventory.evidence), 'Inventory scope evidence required');
  const source = fileProof(value.sourceFile);
  const body = fileProof(value.bodyFile);
  requireThat(fs.statSync(full(value.sourceFile)).size > 0 && fs.statSync(full(value.bodyFile)).size > 0, 'Empty source/body files cannot be captured');
  const prior = page.snapshot;
  const sourceHash = baselineHash(sources.get(page.sourceId));
  if (prior && (sourceHash !== prior.baselineHash || source.sha256 !== prior.source.sha256 || body.sha256 !== prior.body.sha256 || JSON.stringify(prior.inventory) !== JSON.stringify(inventory))) {
    (page.history ||= []).push({ snapshot: prior, review: page.review, analysis: page.analysis, verification: page.verification });
    delete page.review; delete page.analysis; delete page.verification;
  }
  page.snapshot = { ...value, source, body, inventory, baselineHash: sourceHash };
}
function summary() {
  const result = { phase: manifest.phase, legacyClaims: manifest.legacyClaims, sources: [], implementationGate: { ready: false, reasons: [] } };
  for (const source of sources.values()) {
    const pages = Object.values(ledger.pages).filter(page => page.sourceId === source.id);
    const counts = { discovered: 0, fetched: 0, body_reviewed: 0, analyzed: 0, verified: 0, stale_or_invalid: 0 };
    for (const page of pages) counts[status(page).state]++;
    const apiUnits = pages.reduce((sum, page) => sum + (page.snapshot?.inventory?.apiUnits?.length || 0), 0);
    const row = { id: source.id, inventoriedPages: pages.length, expectedPages: source.expectedPages, expectedApiUnits: source.expectedApiUnits, capturedApiUnits: apiUnits, discoveryClosed: source.discoveryClosed, counts, openIssues: source.openIssues };
    result.sources.push(row);
    const reasons = result.implementationGate.reasons;
    if (!source.discoveryClosed) reasons.push(`${source.id}: publisher inventory/link expansion remains open`);
    if (!Number.isInteger(source.expectedPages) || source.expectedPages < 1 || source.expectedPages !== pages.length) reasons.push(`${source.id}: complete page denominator is unknown/unreconciled`);
    if (!Number.isInteger(source.expectedApiUnits) || source.expectedApiUnits < 0 || apiUnits !== source.expectedApiUnits) reasons.push(`${source.id}: API/overload denominator is unknown/unreconciled`);
    if ((source.openIssues || []).length) reasons.push(`${source.id}: unresolved source issues`);
    if (pages.length === 0 || counts.verified !== pages.length) reasons.push(`${source.id}: every body/API is not verified`);
    if (source.discoveryClosed) {
      try {
        const closure = source.closure;
        requireThat(closure?.baselineHash === baselineHash(source), 'Closure is not bound to the current source roots/locale/baseline');
        requireThat(closure && nonempty(closure.actor) && nonempty(closure.verifier) && closure.actor !== closure.verifier, 'Independent discovery closure required');
        requireThat(Array.isArray(closure.evidence) && closure.evidence.length >= 2, 'Publisher inventory and link reconciliation evidence required');
        for (const item of closure.evidence) pinnedProof(item);
        requireThat(closure.inventoryPages === pages.length && closure.apiUnits === apiUnits && closure.unprocessedLinks === 0 && closure.unresolvedRoots === 0, 'Incomplete closure reconciliation');
      } catch (error) { reasons.push(`${source.id}: ${error.message}`); }
    }
  }
  result.implementationGate.ready = result.implementationGate.reasons.length === 0;
  return result;
}

try {
  const [command, arg1, arg2] = argv;
  if (command === 'import') {
    const bundle = read(full(arg1));
    const source = sources.get(bundle.sourceId);
    requireThat(source && Array.isArray(bundle.entries), 'Known source and entries required');
    const proof = fileProof(bundle.discovery.file, bundle.discovery.sha256);
    discoveryUrl(source, bundle.discovery.url);
    let added = 0;
    for (const entry of bundle.entries) {
      requireThat(nonempty(entry.url) && nonempty(entry.title), 'URL and title required');
      const url = canonical(source, entry.url);
      const id = hash(`${source.id}\n${url}`).slice(0, 24);
      const entryProof = entry.discovery ? pinnedProof(entry.discovery) : proof;
      if (entry.discovery) discoveryUrl(source, entry.discovery.url);
      const provenance = { ...entryProof, url: entry.discovery?.url || bundle.discovery.url, parentUrl: entry.parentUrl || bundle.discovery.url };
      if (!ledger.pages[id]) {
        ledger.pages[id] = { id, sourceId: source.id, url, title: entry.title, kind: entry.kind || 'unclassified', discoveredFrom: [], legacyClaims: entry.legacyClaims || [] };
        added++;
      }
      const page = ledger.pages[id];
      if (!page.discoveredFrom.some(item => item.sha256 === entryProof.sha256 && item.url === provenance.url && item.parentUrl === provenance.parentUrl)) page.discoveredFrom.push(provenance);
    }
    ledger.imports.push({ sourceId: source.id, ...proof, date: new Date().toISOString(), entries: bundle.entries.length, added });
    save();
    console.log(JSON.stringify({ sourceId: source.id, added, inputEntries: bundle.entries.length }));
  } else if (command === 'capture') {
    const page = pageById(arg1);
    capture(page, read(full(arg2)));
    save(); console.log(JSON.stringify({ id: page.id, ...status(page) }));
  } else if (command === 'capture-batch') {
    const batch = read(full(arg1));
    requireThat(Array.isArray(batch), 'Snapshot batch must be an array');
    for (const item of batch) capture(pageById(item.pageId), item.snapshot);
    save(); console.log(JSON.stringify({ captured: batch.length, readingPromotions: 0 }));
  } else if (['review', 'analyze', 'verify'].includes(command)) {
    const page = pageById(arg1);
    const report = read(full(arg2));
    ({ review: reviewValid, analyze: analysisValid, verify: verifyValid })[command](page, report);
    const kind = { review: 'review', analyze: 'analysis', verify: 'verification' }[command];
    page[kind] = fileProof(arg2);
    if (command === 'review') { delete page.analysis; delete page.verification; }
    if (command === 'analyze') delete page.verification;
    save(); console.log(JSON.stringify({ id: page.id, ...status(page) }));
  } else if (command === 'page') {
    console.log(JSON.stringify(pageById(arg1), null, 2));
  } else if (command === 'status' || command === 'gate') {
    const result = summary();
    console.log(JSON.stringify(result, null, 2));
    if (command === 'gate' && !result.implementationGate.ready) process.exitCode = 2;
  } else {
    throw new Error('Usage: reference-ledger.mjs import BUNDLE | capture ID SNAPSHOT | capture-batch BUNDLE | review/analyze/verify ID REPORT | page ID | status | gate [--state-dir PATH] [--manifest PATH]');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
