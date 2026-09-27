// FocusGuard popup script

async function getSettings() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, resolve);
  });
}

async function updateSettings(patch) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings: patch }, resolve);
  });
}

function formatDuration(ms) {
  const min = Math.floor(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

async function render() {
  const s = await getSettings();
  if (!s) return;

  document.getElementById('wasted').textContent = formatDuration(s.wastedToday || 0);
  document.getElementById('limit').textContent = `${s.dailyLimitMin || 60} min`;
  document.getElementById('focus').checked = !!s.focusMode;

  const limitMs = (s.dailyLimitMin || 60) * 60000;
  const pct = limitMs > 0 ? Math.min((s.wastedToday / limitMs) * 100, 100) : 0;
  const bar = document.getElementById('bar');
  bar.style.width = pct + '%';
  bar.style.background = pct >= 100 ? '#e11d48' : pct >= 80 ? '#f59e0b' : '#10b981';

  const sitesEl = document.getElementById('sites');
  sitesEl.innerHTML = '';
  (s.distractingSites || []).forEach((site) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = site;
    sitesEl.appendChild(chip);
  });
}

document.getElementById('focus').addEventListener('change', (e) => {
  updateSettings({ focusMode: e.target.checked });
});

document.getElementById('block').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'BLOCK_HOUR' });
  window.close();
});

document.getElementById('open').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://focusguard.app' });
  window.close();
});

render();
