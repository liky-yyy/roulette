import { createSeed, installSeededMathRandom, setRandomSeed } from './utils/random';

type RouletteLike = {
  setMarbles(names: string[]): void;
  start(): void;
  getCurrentMap(): { index?: number; title?: string } | null;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
};

const SHARE_TTL_MS = 60 * 60 * 1000;
const initialParams = new URLSearchParams(location.search);
let currentSeed = initialParams.get('seed') || createSeed();

function resetStream(suffix: string) {
  setRandomSeed(`${currentSeed}:${suffix}`);
  installSeededMathRandom();
}

function toast(message: string) {
  const el = document.createElement('div');
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '99999',
    padding: '10px 16px',
    borderRadius: '10px',
    background: 'rgba(20,20,20,.9)',
    color: '#fff',
    font: '14px sans-serif',
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function namesValue() {
  return (document.querySelector<HTMLTextAreaElement>('#in_names')?.value || '')
    .split(/[,\r\n]/g)
    .map((v) => v.trim())
    .filter(Boolean)
    .join(',');
}

function formatKst(timestamp: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

function buildShareUrl() {
  const url = new URL(location.href);
  url.search = '';
  const createdAt = Date.now();
  url.searchParams.set('seed', currentSeed);
  url.searchParams.set('at', String(createdAt));
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
  return { url, createdAt };
}

function lockReplayUi() {
  document.querySelector('#settings')?.classList.add('hide');
  document
    .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>(
      '#settings input, #settings select, #settings textarea, #settings button'
    )
    .forEach((el) => {
      el.disabled = true;
    });

  const badge = document.createElement('div');
  badge.textContent = '공유된 결과 재생 · 설정 변경 불가';
  Object.assign(badge.style, {
    position: 'fixed',
    top: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '10000',
    padding: '8px 14px',
    borderRadius: '999px',
    background: 'rgba(0,0,0,.75)',
    color: '#fff',
    font: '13px sans-serif',
    pointerEvents: 'none',
  });
  document.body.appendChild(badge);
}

function applyUrlSettings(): boolean {
  const params = new URLSearchParams(location.search);
  if (!params.has('seed')) return false;

  const createdAt = Number(params.get('at'));
  const age = Date.now() - createdAt;
  if (!Number.isFinite(createdAt) || createdAt <= 0 || age < -60_000 || age > SHARE_TTL_MS) {
    alert('이 룰렛 결과 링크는 생성 후 1시간이 지나 만료되었습니다.');
    const cleanUrl = new URL(location.href);
    cleanUrl.search = '';
    history.replaceState(null, '', cleanUrl);
    return false;
  }

  const map = params.get('map');
  const mapSelect = document.querySelector<HTMLSelectElement>('#sltMap');
  if (map && mapSelect && Array.from(mapSelect.options).some((o) => o.value === map)) {
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
  if (winner === 'first') document.querySelector<HTMLButtonElement>('.btn-first-winner')?.click();
  else if (winner === 'last') document.querySelector<HTMLButtonElement>('.btn-last-winner')?.click();
  else if (winner === 'multi') {
    const from = document.querySelector<HTMLInputElement>('#in_rangeStart');
    const to = document.querySelector<HTMLInputElement>('#in_rangeEnd');
    if (from) from.value = params.get('from') || '1';
    if (to) to.value = params.get('to') || '1';
    document.querySelector<HTMLButtonElement>('.btn-multi-winner')?.click();
  } else if (winner) {
    const rank = document.querySelector<HTMLInputElement>('#in_winningRank');
    if (rank) {
      rank.value = winner;
      rank.dispatchEvent(new Event('change'));
    }
  }

  const badge = document.createElement('div');
  badge.textContent = `실행 결과 · ${formatKst(createdAt)} KST · 1시간 유효`;
  Object.assign(badge.style, {
    position: 'fixed',
    top: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '9999',
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(0,0,0,.65)',
    color: '#fff',
    font: '12px sans-serif',
    pointerEvents: 'none',
  });
  document.body.appendChild(badge);
  return true;
}

export function installShareReplay(roulette: RouletteLike) {
  const originalSetMarbles = roulette.setMarbles.bind(roulette);
  roulette.setMarbles = (names: string[]) => {
    resetStream('setup');
    originalSetMarbles(names);
  };

  const originalStart = roulette.start.bind(roulette);
  roulette.start = () => {
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
      shuffle?.addEventListener(
        'click',
        () => {
          currentSeed = createSeed();
        },
        true
      );

      const replayMode = applyUrlSettings();
      if (replayMode) {
        lockReplayUi();
        setTimeout(() => roulette.start(), 300);
        return;
      }

      const share = document.createElement('button');
      share.id = 'btnShareReplay';
      share.type = 'button';
      share.title = '같은 과정과 결과를 1시간 동안 공유';
      share.innerHTML = '<span>🔗 결과 URL</span>';
      share.disabled = true;
      share.title = '룰렛 결과가 나온 뒤 공유할 수 있습니다';
      share.addEventListener('click', async () => {
        const { url, createdAt } = buildShareUrl();
        history.replaceState(null, '', url);
        try {
          await navigator.clipboard.writeText(url.toString());
          toast(`결과 URL 복사 완료 · ${formatKst(createdAt)} KST · 1시간 유효`);
        } catch {
          prompt(`아래 URL을 복사하세요 (${formatKst(createdAt)} KST, 1시간 유효)`, url.toString());
        }
      });
      actions.insertBefore(share, document.querySelector('#btnStart'));

      const invalidateShare = () => {
        share.disabled = true;
        share.title = '룰렛 결과가 나온 뒤 공유할 수 있습니다';
      };
      document.querySelector('#in_names')?.addEventListener('input', invalidateShare);
      document.querySelector('#sltMap')?.addEventListener('change', invalidateShare);
      document.querySelector('#in_winningRank')?.addEventListener('change', invalidateShare);
      document.querySelector('#in_rangeStart')?.addEventListener('change', invalidateShare);
      document.querySelector('#in_rangeEnd')?.addEventListener('change', invalidateShare);
      document.querySelectorAll('.btn-winner, #btnShuffle, #btnStart').forEach((control) => {
        control.addEventListener('click', invalidateShare);
      });

      roulette.addEventListener('goal', () => {
        share.disabled = false;
        share.title = '방금 실행한 과정과 결과 공유';
      });
    };
    wait();
  });
}
