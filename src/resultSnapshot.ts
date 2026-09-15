export type ResultSnapshot = {
  version: 1;
  ranking: { id: number; name: string }[];
  range: { start: number; end: number };
};

export function parseResultSnapshot(raw: string): ResultSnapshot {
  const value = JSON.parse(raw);
  const ranking = value?.ranking;
  const range = value?.range;
  if (
    value?.version !== 1 ||
    !Array.isArray(ranking) ||
    ranking.length === 0 ||
    ranking.length > 10000 ||
    !ranking.every(
      (entry) =>
        entry &&
        Number.isInteger(entry.id) &&
        entry.id >= 0 &&
        entry.id < ranking.length &&
        typeof entry.name === 'string' &&
        entry.name.length > 0
    ) ||
    new Set(ranking.map((entry) => entry.id)).size !== ranking.length ||
    !range ||
    !Number.isInteger(range.start) ||
    !Number.isInteger(range.end) ||
    range.start < 0 ||
    range.end < range.start ||
    range.end >= ranking.length
  )
    throw new Error('Invalid result snapshot');
  return value;
}
