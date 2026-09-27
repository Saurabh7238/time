// FocusGuard — Chrome Extension background service worker
// Tracks active tab time, detects distracting sites, enforces limits.

const DISTRACTING_SITES_DEFAULT = [
  'youtube.com', 'instagram.com', 'facebook.com', 'twitter.com', 'reddit.com',
];

const DAILY_LIMIT_MIN_DEFAULT = 60;

async function getSettings() {
  const stored = await chrome.storage.local.get('settings');
  return stored.settings ?? {
    distractingSites: DISTRACTING_SITES_DEFAULT,
    dailyLimitMin: DAILY_LIMIT_MIN_DEFAULT,
    focusMode: false,
  blockUntil: 0,
  warnedToday: false,
  lastWarnDate: '',
  wastedToday: 0,
    lastDate: '',
  };
}

async function saveSettings(s) {
  await chrome.storage.local.set({ settings: s });
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isDistracting(domain, sites) {
  return sites.some((s) => domain === s || domain.endsWith('.' + s) || domain.includes(s));
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let lastTick = Date.now();

async function tick() {
  const now = Date.now();
  const elapsed = now - lastTick;
  lastTick = now;

  const settings = await getSettings();
  const today = todayStr();

  // Reset daily counters
  if (settings.lastDate !== today) {
    settings.wastedToday = 0;
    settings.warnedToday = false;
    settings.lastDate = today;
  }

  // Check if currently blocked
  if (settings.blockUntil && now < settings.blockUntil) {
    // Still blocked — notify active distracting tab
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab && tab.url && isDistracting(getDomain(tab.url), settings.distractingSites)) {
      chrome.tabs.sendMessage(tab.id, { type: 'BLOCK', quote: getQuote() }).catch(() => {});
    }
    await saveSettings(settings);
    return;
  } else if (settings.blockUntil && now >= settings.blockUntil) {
    settings.blockUntil = 0;
  }

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab && tab.url) {
    const domain = getDomain(tab.url);
    if (isDistracting(domain, settings.distractingSites)) {
      if (settings.focusMode) {
        chrome.tabs.sendMessage(tab.id, { type: 'BLOCK', quote: getQuote() }).catch(() => {});
        return;
      }
      settings.wastedToday += elapsed;
      const limitMs = settings.dailyLimitMin * 60000;
      if (settings.wastedToday >= limitMs) {
        chrome.tabs.sendMessage(tab.id, { type: 'BLOCK', quote: getQuote() }).catch(() => {});
      } else if (settings.wastedToday >= limitMs * 0.8 && !settings.warnedToday) {
        settings.warnedToday = true;
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-128.png',
          title: 'FocusGuard Warning',
          message: 'You have spent 80% of your daily limit on distracting sites.',
          priority: 2,
        });
      }
    }
  }

  await saveSettings(settings);
}

function getQuote() {
  const quotes = [
    'Stay focused. Your future self is watching.',
    'Discipline is the bridge between goals and accomplishment.',
    'Focus is the new superpower in a distracted world.',
    'Small steps every day add up to big results.',
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

// Alarm tick every 5 seconds
chrome.alarms.create('tick', { periodInMinutes: 0.1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'tick') tick();
});

// Also tick on tab activation
chrome.tabs.onActivated.addListener(() => { lastTick = Date.now(); tick(); });

// Handle messages from popup/content
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_STATE') {
    getSettings().then((s) => sendResponse(s));
    return true;
  }
  if (msg.type === 'UPDATE_SETTINGS') {
    getSettings().then((s) => {
      const updated = { ...s, ...msg.settings };
      saveSettings(updated);
      sendResponse(updated);
    });
    return true;
  }
  if (msg.type === 'BLOCK_HOUR') {
    getSettings().then((s) => {
      s.blockUntil = Date.now() + 3600000;
      saveSettings(s);
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.type === 'FIVE_MORE') {
    getSettings().then((s) => {
      s.blockUntil = 0;
      s.wastedToday = Math.max(0, s.wastedToday - 5 * 60000);
      saveSettings(s);
      sendResponse({ ok: true });
    });
    return true;
  }
});
