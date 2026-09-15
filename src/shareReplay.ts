import { createSeed, installSeededMathRandom, setRandomSeed } from './utils/random';

type RouletteLike = {
  setMarbles(names: string[]): void;
  start(): void;
  getCurrentMap(): { index?: number; title?: string } | null;
};

let currentSeed = new URLSearchParams(location.search).get('seed') || createSeed();

function resetStream(suffix: string) {
  setRandomSeed(`${currentSeed}:${suffix}`);
  installSeededMathRandom();
}

function toast(message: string) {
  const el = document.createElement('div');
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    zIndex: '99999', padding: '10px 16px', borderRadius: '10px',
    background: 'rgba(20,20,20,.9)', color: '#fff', font: '14px sans-serif'
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

function namesValue() {
  return (document.querySelector<HTMLTextAreaElement>('#in_names')?.value || '')
    .split(/[,\r\n]/g).map((v) => v.trim()).filter(Boolean).join(',');
}

function buildShareUrl(roulette: RouletteLike) {
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('seed', currentSeed);
  url.searchParams.set('names', namesValue());

  const map = document.querySelector<HTMLSelectElement>('#sltMap');
  if (map?.value) url.searchParams.set('map', map.value);

  const skills = document.querySelector<HTMLInputElement>('#chkSkill');
  url.searchParams.set('skills', skills?.checked ? '1' : '0');

  const first = document.querySelector('.btn-first-winner.active');
  const last = document.querySelector('.btn-last-winner.active');
  const multi = document.querySelector('.btn-multi-winner.active');
  if (first) url.searchParams.set('winner', 'first');
  else if (last) url.searchParams.set('winner', 'last');
  else if (multi) {
    url.searchParams.set('winner', 'multi');
    url.searchParams.set('from', document.querySelector<HTMLInputElement>('#in_rangeStart')?.value || '1');
    url.searchParams.set('to', document.querySelector<HTMLInputElement>('#in_rangeEnd')?.value || '1');
  } else {
    url.searchParams.set('winner', document.querySelector<HTMLInputElement>('#in_winningRank')?.value || '1');
  }
  return url;
}

function applyUrlSettings() {
  const params = new URLSearchParams(location.search);
  if (!params.has('seed')) return;

  const map = params.get('map');
  const mapSelect = document.querySelector<HTMLSelectElement>('#sltMap');
  if (map && mapSelect && [...mapSelect.options].some((o) => o.value === map)) {
    mapSelect.value = map;
    mapSelect.dispatchEvent(new Event('change'));
  }

  const skills = params.get('skills');
  const skillInput = document.querySelector<HTMLInputElement>('#chkSkill');
  if (skills !== null && skillInput) {
    skillInput.checked = skills !== '0';
    skillInput.dispatchEvent(new Event('change'));
  }

  const winner = params.get('winner');
  if (winner === 'first') (document.querySelector<HTMLButtonElement>('.btn-first-winner'))?.click();
  else if (winner === 'last') (document.querySelector<HTMLButtonElement>('.btn-last-winner'))?.click();
  else if (winner === 'multi') {
    const from = document.querySelector<HTMLInputElement>('#in_rangeStart');
    const to = document.querySelector<HTMLInputElement>('#in_rangeEnd');
    if (from) from.value = params.get('from') || '1';
    if (to) to.value = params.get('to') || '1';
    (document.querySelector<HTMLButtonElement>('.btn-multi-winner'))?.click();
  } else if (winner) {
    const rank = document.querySelector<HTMLInputElement>('#in_winningRank');
    if (rank) {
      rank.value = winner;
      rank.dispatchEvent(new Event('change'));
    }
  }

  const badge = document.createElement('div');
  badge.textContent = `Replay seed: ${currentSeed}`;
  Object.assign(badge.style, {
    position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)',
    zIndex: '9999', padding: '6px 10px', borderRadius: '999px',
    background: 'rgba(0,0,0,.65)', color: '#fff', font: '12px monospace', pointerEvents: 'none'
  });
  document.body.appendChild(badge);
}

export function installShareReplay(roulette: RouletteLike) {
  const originalSetMarbles = roulette.setMarbles.bind(roulette);
  roulette.setMarbles = (names: string[]) => {
    resetStream('setup');
    originalSetMarbles(names);
  };

  const originalStart = roulette.start.bind(roulette);
  roulette.start = () => {
    // Ads or UI work between setup and start must not alter the gameplay stream.
    resetStream('run');
    originalStart();
  };

  document.addEventListener('DOMContentLoaded', () => {
    const wait = () => {
      const actions = document.querySelector('.actions');
      const map = document.querySelector<HTMLSelectElement>('#sltMap');
      if (!actions || !map || map.options.length === 0) {
        setTimeout(wait, 100);
        return;
      }

      const shuffle = document.querySelector<HTMLButtonElement>('#btnShuffle');
      shuffle?.addEventListener('click', () => {
        // A manual shuffle intentionally creates a new shareable outcome.
        if (!new URLSearchParams(location.search).has('seed')) currentSeed = createSeed();
      }, true);

      const share = document.createElement('button');
      share.id = 'btnShareReplay';
      share.type = 'button';
      share.title = '같은 과정과 결과를 공유';
      share.innerHTML = '<span>🔗 결과 URL</span>';
      share.addEventListener('click', async () => {
        const url = buildShareUrl(roulette);
        history.replaceState(null, '', url);
        try {
          await navigator.clipboard.writeText(url.toString());
          toast('동일 결과 URL을 복사했습니다');
        } catch {
          prompt('아래 URL을 복사하세요', url.toString());
        }
      });
      actions.insertBefore(share, document.querySelector('#btnStart'));

      applyUrlSettings();
    };
    wait();
  });
}
