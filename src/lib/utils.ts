export const MOTIVATIONAL_QUOTES = [
  'Stay focused. Your future self is watching.',
  'Discipline is the bridge between goals and accomplishment.',
  'You don\'t have to be extreme, just consistent.',
  'Small steps every day add up to big results.',
  'Focus is the new superpower in a distracted world.',
  'The secret of getting ahead is getting started.',
  'Don\'t watch the clock; do what it does — keep going.',
  'Your only limit is your mind.',
  'Concentrate all your thoughts upon the work at hand.',
  'Success is the sum of small efforts repeated day in and day out.',
  'अभी ध्यान दें, बाद में आनंद लें।',
  'एक काम करो, उसे पूरा करो।',
];

export function randomQuote(): string {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

export function formatDuration(ms: number, lang: 'en' | 'hi'): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const hLabel = lang === 'hi' ? 'घं' : 'h';
  const mLabel = lang === 'hi' ? 'मि' : 'm';
  if (h > 0) return `${h}${hLabel} ${m}${mLabel}`;
  return `${m}${mLabel}`;
}

export function formatTime(time: string, lang: 'en' | 'hi'): string {
  const [hStr, m] = time.split(':');
  const h = parseInt(hStr, 10);
  const ampm = h < 12 ? (lang === 'hi' ? 'पूर्वाह्न' : 'AM') : (lang === 'hi' ? 'अपराह्न' : 'PM');
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function getDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

export function isDistracting(domain: string, sites: string[]): boolean {
  return sites.some(s => domain === s || domain.endsWith('.' + s) || domain.includes(s));
}
