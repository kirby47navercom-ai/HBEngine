import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('./reference-ledger.mjs', import.meta.url));
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-reference-ledger-'));
  const write = (name, value) => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
    return file;
  };
  const source = { id: 'api', engine: 'Unreal', version: '5.8', hosts: ['dev.epicgames.com'], pathPrefix: '/documentation/en-us/unreal-engine/API', expectedPages: null, expectedApiUnits: null, discoveryClosed: false, openIssues: ['discovery still open'] };
  const manifest = { schemaVersion: 1, phase: 'research_only', sources: [source] };
  const manifestFile = write('manifest.json', manifest);
  const stateDir = path.join(dir, 'state');
  const run = (...args) => spawnSync(process.execPath, [cli, ...args, '--state-dir', stateDir, '--manifest', manifestFile], { encoding: 'utf8' });
  const sourceFile = write('original.html', '<h1>API version 5.8</h1><p>Declaration A(int) and A(float)</p>');
  const bodyFile = write('body.json', { sections: ['overview', 'overloads'], overloads: ['A(int)', 'A(float)'] });
  const url = 'https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Owner/A?application_version=5.8';
  const bundle = { sourceId: 'api', discovery: { file: sourceFile, sha256: digest(fs.readFileSync(sourceFile)), url }, entries: [{ title: 'A', url }, { title: 'A alias', url: `${url}#overloads` }] };
  const bundleFile = write('bundle.json', bundle);
  assert.equal(run('import', bundleFile).status, 0);
  const ledger = () => JSON.parse(fs.readFileSync(path.join(stateDir, 'ledger.json'), 'utf8'));
  const pageId = Object.keys(ledger().pages)[0];
  const snapshot = { canonicalUrl: url, httpStatus: 200, actualBody: true, version: '5.8', versionEvidence: 'Original heading explicitly names version 5.8', bodyMethod: 'fixture exact body', sourceFile, bodyFile, inventory: { complete: true, sections: ['overview', 'overloads'], apiUnits: ['A(int)', 'A(float)'], media: [], openIssues: [], evidence: 'Both headings and both complete overloads inspected' } };
  const bound = () => ({ pageId, actor: 'reader', date: '2026-10-04', sourceHash: digest(fs.readFileSync(sourceFile)), bodyHash: digest(fs.readFileSync(bodyFile)) });
  const review = () => ({ ...bound(), sections: snapshot.inventory.sections, apiUnits: snapshot.inventory.apiUnits, media: [], readScope: 'entire_body', readEvidence: 'Direct comparison of both source sections and overloads' });
  const analysis = () => ({ ...bound(), analysis: { sections: snapshot.inventory.sections.map(id => ({ id, evidence: `source heading ${id}`, finding: `Exact ${id} content contrasted with declarations`, hbDecision: `${id} preserved in the common C++/node contract` })), apiUnits: snapshot.inventory.apiUnits.map(id => ({ id, evidence: `source declaration ${id}`, finding: `${id} has an independently typed input`, hbDecision: `${id} retains its overload` })), editor: 'Separate display of two overloads', runtime: 'Typed dispatch', cppBlueprint: 'Preserve matching typed contracts', humanAi: 'Stable overload IDs', dependencies: 'Declaring owner', limitations: 'Fixture intentionally has only two overloads' }, openIssues: [] });
  return { dir, write, run, manifest, source, manifestFile, sourceFile, bodyFile, bundle, bundleFile, pageId, ledger, snapshot, bound, review, analysis };
}
function cleanup(f) { fs.rmSync(f.dir, { recursive: true, force: true }); }

test('official inventory import deduplicates aliases without promoting reading, and wrong URL/version is rejected', () => {
  const f = fixture();
  try {
    assert.equal(Object.keys(f.ledger().pages).length, 1);
    const result = JSON.parse(f.run('status').stdout);
    assert.equal(result.sources[0].counts.discovered, 1);
    assert.equal(result.sources[0].counts.analyzed, 0);
    assert.equal(f.run('gate').status, 2);
    for (const url of ['https://example.com/not-official', 'https://dev.epicgames.com/documentation/en-us/unreal-engine/API/A?application_version=4.27']) {
      assert.equal(f.run('import', f.write('wrong.json', { ...f.bundle, entries: [{ title: 'Wrong', url }] })).status, 1);
    }
    assert.equal(Object.keys(f.ledger().pages).length, 1);
  } finally { cleanup(f); }
});

test('HTTP 200, collected bodies, missing overloads and partial inventories cannot count as full analysis', () => {
  const f = fixture();
  try {
    assert.equal(f.run('capture', f.pageId, f.write('shell.json', { ...f.snapshot, actualBody: false })).status, 1);
    assert.equal(f.run('capture', f.pageId, f.write('snapshot.json', { ...f.snapshot, inventory: { ...f.snapshot.inventory, complete: false } })).status, 0);
    assert.equal(JSON.parse(f.run('status').stdout).sources[0].counts.fetched, 1);
    assert.equal(f.run('review', f.pageId, f.write('review.json', f.review())).status, 1);
    assert.equal(f.run('capture', f.pageId, f.write('snapshot.json', f.snapshot)).status, 0);
    assert.equal(f.run('capture', f.pageId, f.write('empty-id.json', { ...f.snapshot, inventory: { ...f.snapshot.inventory, apiUnits: [''] } })).status, 1);
    assert.equal(f.run('capture', f.pageId, f.write('empty-media.json', { ...f.snapshot, inventory: { ...f.snapshot.inventory, media: [''] } })).status, 1);
    assert.equal(f.run('review', f.pageId, f.write('review.json', { ...f.review(), apiUnits: ['A(int)'] })).status, 1);
    assert.equal(f.run('analyze', f.pageId, f.write('analysis.json', f.analysis())).status, 1);
    assert.equal(f.run('gate').status, 2);
  } finally { cleanup(f); }
});

test('gate needs independent complete evidence and discovery closure; changed bodies or analyses invalidate completion', () => {
  const f = fixture();
  try {
    assert.equal(f.run('capture', f.pageId, f.write('snapshot.json', f.snapshot)).status, 0);
    const reviewFile = f.write('review.json', f.review());
    const analysisFile = f.write('analysis.json', f.analysis());
    assert.equal(f.run('review', f.pageId, reviewFile).status, 0);
    assert.equal(f.run('analyze', f.pageId, analysisFile).status, 0);
    const verification = { ...f.review(), actor: 'reader', analysisHash: digest(fs.readFileSync(analysisFile)), comparisonEvidence: 'Independently compared both original sections and declarations to each analysis finding', openIssues: [] };
    assert.equal(f.run('verify', f.pageId, f.write('verification.json', verification)).status, 1);
    verification.actor = 'verifier';
    assert.equal(f.run('verify', f.pageId, f.write('verification.json', verification)).status, 0);
    assert.equal(f.run('gate').status, 2);
    f.source.expectedPages = 1;
    f.source.expectedApiUnits = 2;
    f.source.discoveryClosed = true;
    f.source.openIssues = [];
    const baselineHash = digest(JSON.stringify({ id: f.source.id, engine: f.source.engine, version: f.source.version, locale: f.source.locale, roots: f.source.roots, hosts: f.source.hosts, pathPrefix: f.source.pathPrefix }));
    f.source.closure = { baselineHash, actor: 'discoverer', verifier: 'inventory-verifier', evidence: [f.sourceFile, f.bodyFile].map(file => ({ file, sha256: digest(fs.readFileSync(file)) })), inventoryPages: 1, apiUnits: 2, unprocessedLinks: 0, unresolvedRoots: 0 };
    f.write('manifest.json', f.manifest);
    assert.equal(f.run('gate').status, 0);
    f.source.roots = ['https://dev.epicgames.com/documentation/en-us/unreal-engine/API/NewRoot'];
    f.write('manifest.json', f.manifest);
    assert.equal(f.run('gate').status, 2);
    delete f.source.roots;
    f.source.locale = 'ko';
    f.write('manifest.json', f.manifest);
    assert.equal(f.run('gate').status, 2);
    delete f.source.locale;
    f.source.version = '4.27';
    f.write('manifest.json', f.manifest);
    assert.equal(f.run('gate').status, 2);
    f.source.version = '5.8';
    f.source.closure.evidence[0].sha256 = undefined;
    f.write('manifest.json', f.manifest);
    assert.equal(f.run('gate').status, 2);
    f.source.closure.evidence[0].sha256 = digest(fs.readFileSync(f.sourceFile));
    f.write('manifest.json', f.manifest);
    fs.appendFileSync(analysisFile, ' ');
    assert.equal(f.run('gate').status, 2);
    f.write('analysis.json', f.analysis());
    fs.appendFileSync(f.bodyFile, ' ');
    assert.equal(JSON.parse(f.run('status').stdout).sources[0].counts.stale_or_invalid, 1);
    assert.equal(f.run('gate').status, 2);
    assert.equal(f.run('capture', f.pageId, f.write('snapshot.json', f.snapshot)).status, 0);
    assert.equal(f.ledger().pages[f.pageId].review, undefined);
    assert.equal(f.ledger().pages[f.pageId].history.length, 1);
  } finally { cleanup(f); }
});

test('Python URLs also enforce application_version and source provenance must remain available', () => {
  const f = fixture();
  try {
    f.source.pathPrefix = '/documentation/en-us/unreal-engine/python-api/';
    f.write('manifest.json', f.manifest);
    const url = 'https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/Actor?application_version=4.27';
    const bundle = { ...f.bundle, discovery: { ...f.bundle.discovery, url }, entries: [{ title: 'Actor', url }] };
    assert.equal(f.run('import', f.write('python.json', bundle)).status, 1);
    f.source.pathPrefix = '/documentation/en-us/unreal-engine/API';
    f.write('manifest.json', f.manifest);
    fs.unlinkSync(f.sourceFile);
    assert.equal(JSON.parse(f.run('status').stdout).sources[0].counts.stale_or_invalid, 1);
  } finally { cleanup(f); }
});

test('empty source roots cannot produce a vacuous completed gate', () => {
  const f = fixture();
  try {
    f.write('manifest.json', { ...f.manifest, sources: [] });
    assert.equal(f.run('gate').status, 1);
  } finally { cleanup(f); }
});

test('cross-family official catalogs can discover version-pinned package pages', () => {
  const f = fixture();
  try {
    Object.assign(f.source, { id: 'unity-packages', engine: 'Unity', version: '6000.0-compatible-package-versions', hosts: ['docs.unity3d.com'], pathPrefix: '/Packages/' });
    f.write('manifest.json', f.manifest);
    const bundle = { sourceId: 'unity-packages', discovery: { file: f.sourceFile, sha256: digest(fs.readFileSync(f.sourceFile)), url: 'https://docs.unity3d.com/6000.0/Documentation/Manual/PackagesList.html' }, entries: [{ title: 'Input System', url: 'https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/index.html' }] };
    assert.equal(f.run('import', f.write('package.json', bundle)).status, 0);
    bundle.entries[0].url = 'https://docs.unity3d.com/Packages/com.unity.inputsystem/manual/index.html';
    assert.equal(f.run('import', f.write('package.json', bundle)).status, 1);
    bundle.entries[0].url = 'https://docs.unity3d.com/Packages/com.unity.inputsystem@latest/manual/index.html';
    assert.equal(f.run('import', f.write('package.json', bundle)).status, 1);
  } finally { cleanup(f); }
});

test('bulk capture has the same evidence guards and does not persist a partially invalid batch', () => {
  const f = fixture();
  try {
    const batch = [{ pageId: f.pageId, snapshot: f.snapshot }, { pageId: f.pageId, snapshot: { ...f.snapshot, actualBody: false } }];
    assert.equal(f.run('capture-batch', f.write('batch.json', batch)).status, 1);
    assert.equal(f.ledger().pages[f.pageId].snapshot, undefined);
    assert.equal(f.run('capture-batch', f.write('batch.json', [batch[0]])).status, 0);
    assert.equal(JSON.parse(f.run('status').stdout).sources[0].counts.fetched, 1);
    assert.equal(f.run('gate').status, 2);
  } finally { cleanup(f); }
});

test('referenced semantic artifacts must be pinned and changed nested artifacts invalidate status', () => {
  const f = fixture();
  try {
    assert.equal(f.run('capture', f.pageId, f.write('snapshot.json', f.snapshot)).status, 0);
    const docDir = path.join(f.dir, 'docs', 'research');
    fs.mkdirSync(docDir, { recursive: true });
    const artifact = f.write('docs/research/analysis.md', 'Source-specific full table analysis');
    const review = { ...f.review(), readEvidence: `Compared original source to ${artifact}` };
    assert.equal(f.run('review', f.pageId, f.write('review.json', review)).status, 1);
    const mdProof = { file: artifact, sha256: digest(fs.readFileSync(artifact)) };
    review.evidenceArtifacts = [mdProof];
    assert.equal(f.run('review', f.pageId, f.write('review.json', review)).status, 0);
    const nested = f.write('nested.json', { evidenceArtifacts: [mdProof] });
    const analysis = { ...f.analysis(), evidenceArtifacts: [{ file: nested, sha256: digest(fs.readFileSync(nested)) }] };
    assert.equal(f.run('analyze', f.pageId, f.write('analysis.json', analysis)).status, 0);
    assert.equal(JSON.parse(f.run('status').stdout).sources[0].counts.analyzed, 1);
    fs.appendFileSync(artifact, '\nChanged table semantics');
    assert.equal(JSON.parse(f.run('status').stdout).sources[0].counts.stale_or_invalid, 1);
    assert.equal(f.run('gate').status, 2);
    f.write('docs/research/analysis.md', 'Source-specific full table analysis');
    assert.equal(JSON.parse(f.run('status').stdout).sources[0].counts.analyzed, 1);
    // Isolate the nested chain: the new review carries no Markdown dependency.
    assert.equal(f.run('review', f.pageId, f.write('review.json', f.review())).status, 0);
    assert.equal(f.run('analyze', f.pageId, f.write('analysis.json', analysis)).status, 0);
    fs.appendFileSync(artifact, '\nNested-only dependency changed');
    assert.equal(JSON.parse(f.run('status').stdout).sources[0].counts.stale_or_invalid, 1);
    assert.equal(f.run('gate').status, 2);
    f.write('docs/research/analysis.md', 'Source-specific full table analysis');
    const invalid = { ...f.review(), evidenceArtifacts: [mdProof, mdProof] };
    assert.equal(f.run('review', f.pageId, f.write('duplicate.json', invalid)).status, 1);
    const cycle = f.write('cycle.json', { evidenceArtifacts: [{ file: 'cycle.json', sha256: 'f'.repeat(64) }] });
    assert.equal(f.run('review', f.pageId, f.write('cycle-review.json', { ...f.review(), evidenceArtifacts: [{ file: cycle, sha256: digest(fs.readFileSync(cycle)) }] })).status, 1);
  } finally { cleanup(f); }
});

test('entry-specific official discovery proofs are retained when the catalog proof is unchanged', () => {
  const f = fixture();
  try {
    const second = f.write('second-official-index.html', '<a>Separate official member index</a>');
    const entryProof = { file: second, sha256: digest(fs.readFileSync(second)), url: f.bundle.discovery.url };
    const bundle = { ...f.bundle, entries: [{ ...f.bundle.entries[0], discovery: entryProof }] };
    assert.equal(f.run('import', f.write('second-bundle.json', bundle)).status, 0);
    const evidence = f.ledger().pages[f.pageId].discoveredFrom;
    assert.equal(evidence.length, 2);
    assert.equal(evidence[1].sha256, entryProof.sha256);
    assert.equal(f.run('import', f.write('second-bundle.json', bundle)).status, 0);
    assert.equal(f.ledger().pages[f.pageId].discoveredFrom.length, 2);
  } finally { cleanup(f); }
});
