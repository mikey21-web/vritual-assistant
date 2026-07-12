const KEY = 'dismissedInsights';

function readSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function isInsightDismissed(id: string): boolean {
  return readSet().has(id);
}

export function dismissInsight(id: string) {
  const set = readSet();
  set.add(id);
  sessionStorage.setItem(KEY, JSON.stringify(Array.from(set)));
}
