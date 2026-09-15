import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Box2DFactory from 'box2d-wasm';
import { Camera } from '../src/camera';
import { stages } from '../src/data/maps';
import options from '../src/options';
import { ParticleManager } from '../src/particleManager';
import { Box2dPhysics } from '../src/physics-box2d';
import { RankRenderer } from '../src/rankRenderer';
import { Roulette } from '../src/roulette';
import { setRandomSeed, setVisualSeed } from '../src/utils/random';

options.useSkills = false;
(globalThis as any).window = { setTimeout, clearTimeout };

async function main() {
  const Box2D = await Box2DFactory({
    wasmBinary: readFileSync(new URL('../node_modules/box2d-wasm/dist/umd/Box2D.simd.wasm', import.meta.url)),
  } as any);

function run(map: number, count: number, frames: number[], idle: number, previousRound: boolean, seed: string) {
  const physics: any = new Box2dPhysics();
  physics.Box2D = Box2D;
  physics.gravity = new Box2D.b2Vec2(0, 10);
  physics.world = new Box2D.b2World(physics.gravity);

  const game: any = new EventTarget();
  Object.setPrototypeOf(game, Roulette.prototype);
  const rank: any = new RankRenderer();
  Object.assign(game, {
    physics,
    _stage: stages[map],
    _marbles: [],
    _winners: [],
    _pendingRemovals: [],
    _result: null,
    _roundStarted: false,
    _rankingComplete: false,
    _isRunning: false,
    _elapsed: 0,
    _lastTime: 0,
    _updateInterval: 10,
    _timeScale: 1,
    _speed: 1,
    _winnerRange: { start: 0, end: 0 },
    _goalDist: Infinity,
    _camera: new Camera(),
    _renderer: { width: 800, height: 450 },
    _effects: [],
    _particleManager: new ParticleManager(),
    _uiObjects: [rank],
    _recorder: { stop() {} },
    _autoRecording: false,
    fastForwarder: { onMouseUp() {} },
  });

  options.winnerRange = { start: 0, end: count === 16 ? 4 : 0 };
  const names = Array.from({ length: count }, (_, i) => `참가자${i % 3}/${(i % 5) + 1}`);

  if (previousRound) {
    setRandomSeed('previous-round:setup');
    game.setMarbles(['이전*7']);
    setRandomSeed('previous-round:run');
    game.start();
    game._advance(5000);
  }

  setRandomSeed(`${seed}:setup`);
  game.setMarbles(names);
  const idleStage = JSON.stringify(physics.getEntities().map((entity: any) => entity.angle));
  game._advance(idle);
  assert.equal(JSON.stringify(physics.getEntities().map((entity: any) => entity.angle)), idleStage);

  // installShareReplay.start가 실제 시작 직전에 만드는 표준 초기 상태와 동일하다.
  setRandomSeed(`${seed}:setup`);
  game.setMarbles(names);
  setRandomSeed(`${seed}:run`);
  setVisualSeed(seed);
  game.start();

  let ticks = 0;
  const hash = createHash('sha256');
  const step = physics.step.bind(physics);
  physics.step = (seconds: number) => {
    step(seconds);
    ticks++;
    hash.update(
      JSON.stringify({
        tick: ticks,
        scale: game._timeScale,
        marbles: game._marbles.map((marble: any) => [marble.id, marble.x, marble.y, marble.angle]),
        entities: physics.getEntities().map((entity: any) => entity.angle),
        winners: game._winners.map((marble: any) => marble.id),
        camera: [game._camera.x, game._camera.y, game._camera.zoom],
        rank: [rank._currentY, rank._targetY],
        particles: game._particleManager._particles.map((particle: any) => [particle.position, particle.color]),
      })
    );
  };

  let frame = 0;
  while (!game._rankingComplete && ticks < 90000) game._advance(frames[frame++ % frames.length]);
  assert.ok(game._rankingComplete, `map ${map}: unfinished`);

  const result = { trajectory: hash.digest('hex'), ticks, ranking: game.getResultSnapshot() };
  Box2D.destroy(physics.world);
  Box2D.destroy(physics.gravity);
  return result;
}

for (let map = 0; map < stages.length; map++) {
  for (const count of [6, 16]) {
    const seed = `replay-test-${map}-${count}`;
    const reference = run(map, count, [10], 0, false, seed);
    const schedules = [[16, 17, 17], [7], [100], [3, 77, 250, 0, 11]];
    for (const frames of schedules) {
      assert.deepEqual(run(map, count, frames, 15000, true, seed), reference);
    }
    console.log(`PASS map=${map} count=${count}: trajectory and ranking match across 5 frame schedules`);
  }
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
