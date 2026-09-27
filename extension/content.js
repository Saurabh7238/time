// FocusGuard — content script injected into all pages
// Listens for BLOCK messages from background and shows a full-screen block overlay.

let overlay = null;

function getQuote() {
  const quotes = [
    'Stay focused. Your future self is watching.',
    'Discipline is the bridge between goals and accomplishment.',
    'Focus is the new superpower in a distracted world.',
    'Small steps every day add up to big results.',
    'The secret of getting ahead is getting started.',
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function showBlock(quote) {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.id = 'focusguard-block';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
    background: rgba(225, 29, 72, 0.97); backdrop-filter: blur(8px);
    color: white; font-family: system-ui, sans-serif; text-align: center;
  `;
  overlay.innerHTML = `
    <div style="max-width: 420px; padding: 32px;">
      <div style="width: 80px; height: 80px; margin: 0 auto 24px; border-radius: 50%;
                  background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 8px;">Daily Limit Reached</h2>
      <p style="color: #fecdd3; margin: 0 0 24px;">You have reached your daily screen time limit.</p>
      <blockquote style="font-size: 18px; font-style: italic; background: rgba(255,255,255,0.1);
                    padding: 16px; border-radius: 12px; margin: 0 0 32px;">"${quote}"</blockquote>
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <button id="fg-five" style="padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer;
                background: rgba(255,255,255,0.2); color: white; font-weight: 600;">5 min more</button>
        <button id="fg-hour" style="padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer;
                background: white; color: #e11d48; font-weight: 600;">Block for 1 hour</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  document.getElementById('fg-five').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'FIVE_MORE' });
    removeBlock();
  });
  document.getElementById('fg-hour').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'BLOCK_HOUR' });
    removeBlock();
  });
}

function removeBlock() {
  if (overlay) {
    overlay.remove();
    overlay = null;
    document.body.style.overflow = '';
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'BLOCK') {
    showBlock(msg.quote || getQuote());
  }
  if (msg.type === 'UNBLOCK') {
    removeBlock();
  }
});
