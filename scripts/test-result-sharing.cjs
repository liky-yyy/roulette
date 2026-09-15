const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function load(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
  }).outputText;
  vm.runInNewContext(code, {
    exports, require: (name) => dependencies[name] || {}, EventTarget, Event, CustomEvent,
    setTimeout: () => 0, window: { setTimeout: () => 0, clearTimeout() {} },
  });
  return exports;
}
const snapshots = load('src/resultSnapshot.ts');
const { Roulette } = load('src/roulette.ts', {
  './resultSnapshot': snapshots,
  './utils/bound.decorator': { bound: () => undefined },
  './data/constants': { Skills: { Impact: 1 }, zoomThreshold: 10 },
  './marble': { Marble: class { constructor(_physics, id, _max, name) { Object.assign(this, { id, name }); } } },
});
function game() {
  const g = new EventTarget();
  Object.setPrototypeOf(g, Roulette.prototype);
  Object.assign(g, {
    _marbles: [], _winners: [], _pendingRemovals: [], _result: null,
    _winnerRange: { start: 0, end: 0 }, _rankingComplete: false, _roundStarted: true,
    _isRunning: true, _stage: { goalY: 10, zoomY: 10 },
    physics: { clearMarbles() {}, removeMarble() {} },
    _particleManager: { shot() {} }, _renderer: { width: 800, height: 600 },
  });
  return g;
}
const marble = (id, name, y) => ({ id, name, y, update() {} });

test('sharing waits for all ranks, not just first-place goal', () => {
  const g = game();
  g._marbles = [marble(2, '수박', 11), marble(0, '키위', 4), marble(1, '수박', 2)];
  let complete = 0;
  g.addEventListener('rankingcomplete', () => complete++);
  g._updateMarbles(10, 1);
  assert.equal(g._result[0].name, '수박');
  assert.equal(g.getResultSnapshot(), null);
  g._marbles[0].y = 11;
  g._updateMarbles(10, 1);
  assert.equal(JSON.stringify(g.getResultSnapshot().ranking.map(x => x.id)), '[2,0,1]');
  assert.equal(complete, 1);
  g._updateMarbles(10, 1);
  assert.equal(complete, 1);
});

test('URL round-trip restores every rank including duplicate names and selected range', () => {
  const original = { version: 1, ranking: [{ id: 2, name: '수박' }, { id: 0, name: '키위 & + # 🍋' }, { id: 1, name: '수박' }], range: { start: 1, end: 2 } };
  const url = new URL('https://example.com/roulette/');
  url.searchParams.set('result', JSON.stringify(original));
  for (let run = 0; run < 20; run++) {
    const g = game();
    g.restoreResultSnapshot(snapshots.parseResultSnapshot(new URL(url).searchParams.get('result')));
    for (let frame = 0; frame < run; frame++) g._updateMarbles(10, 1);
    assert.equal(JSON.stringify(g.getResultSnapshot()), JSON.stringify(original));
    assert.equal(g._result.length, 2);
    assert.equal(g._isRunning, false);
    g.clearMarbles();
    assert.equal(g.getResultSnapshot(), null);
  }
});

test('malformed, incomplete, duplicate-ID and invalid-range snapshots are rejected', () => {
  for (const value of [null, {}, { version: 1, ranking: [], range: { start: 0, end: 0 } },
    { version: 1, ranking: [{ id: 0, name: 'a' }, { id: 0, name: 'a' }], range: { start: 0, end: 0 } },
    { version: 1, ranking: [{ id: 0, name: 'a' }], range: { start: 0, end: 1 } }]) {
    assert.throws(() => snapshots.parseResultSnapshot(JSON.stringify(value)));
  }
});
