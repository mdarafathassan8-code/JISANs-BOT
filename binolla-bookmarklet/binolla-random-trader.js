(() => {
  'use strict';

  if (window.__BINOLLA_RANDOM_TRADER__) return;
  window.__BINOLLA_RANDOM_TRADER__ = true;

  // Replace this with the public URL of your logo if you want the exact image.
  const LOGO_URL = 'https://raw.githubusercontent.com/mdarafathassan8-code/JISANs-BOT/main/binolla-bookmarklet/logo-placeholder.svg';
  const SCAN_DELAY = 700;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const scanPlatform = () => ({
    text: document.body ? document.body.innerText : '',
    buttons: [...document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"]')]
      .map(el => ({
        text: (el.innerText || el.value || el.getAttribute('aria-label') || el.title || '').trim(),
        disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
        visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
      }))
  });

  const isHigher = text => /\b(HIGHER|UP|CALL|BUY)\b/i.test(text);
  const isLower = text => /\b(LOWER|DOWN|PUT|SELL)\b/i.test(text);

  const findTradeButton = direction => {
    const nodes = [...document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"],a')];
    const matcher = direction === 'HIGHER' ? isHigher : isLower;
    return nodes.find(el => {
      const text = (el.innerText || el.value || el.getAttribute('aria-label') || el.title || '').trim();
      const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const disabled = !!el.disabled || el.getAttribute('aria-disabled') === 'true';
      return visible && !disabled && matcher(text);
    });
  };

  const setStatus = (text, state = '') => {
    const box = document.getElementById('__binolla_status');
    if (box) {
      box.textContent = text;
      box.dataset.state = state;
    }
  };

  const run = async () => {
    setStatus('SCANNING 1/2…', 'scan');
    const first = scanPlatform();
    await sleep(SCAN_DELAY);
    setStatus('SCANNING 2/2…', 'scan');
    const second = scanPlatform();
    await sleep(250);

    // The scan is intentionally observational; the final direction is random.
    const direction = Math.random() < 0.5 ? 'HIGHER' : 'LOWER';
    const button = findTradeButton(direction);

    if (!button) {
      setStatus(`${direction} BUTTON NOT FOUND`, 'error');
      console.warn('[Binolla Random Trader] Trade button not found.', { first, second, direction });
      return;
    }

    setStatus(`${direction} SELECTED — CLICKING…`, 'trade');
    button.click();
    setStatus(`${direction} CLICKED`, 'done');
  };

  const panel = document.createElement('div');
  panel.id = '__binolla_random_trader';
  panel.style.cssText = [
    'position:fixed','right:12px','top:50%','transform:translateY(-50%)','z-index:2147483647',
    'display:flex','flex-direction:column','align-items:center','gap:7px','font-family:Arial,sans-serif',
    'user-select:none','touch-action:manipulation'
  ].join(';');

  const img = document.createElement('img');
  img.src = LOGO_URL;
  img.alt = 'TRADER';
  img.title = 'CLICK TO SCAN TWICE AND RANDOMLY SELECT HIGHER/LOWER';
  img.style.cssText = 'width:58px;height:58px;border-radius:50%;object-fit:cover;cursor:pointer;border:2px solid #10b981;background:#111827;box-shadow:0 4px 18px rgba(0,0,0,.45);';

  const status = document.createElement('div');
  status.id = '__binolla_status';
  status.textContent = 'READY';
  status.style.cssText = 'max-width:150px;padding:5px 8px;border-radius:7px;background:rgba(17,24,39,.94);color:#fff;font-size:10px;font-weight:700;text-align:center;line-height:1.25;box-shadow:0 3px 12px rgba(0,0,0,.35);';

  img.addEventListener('click', () => {
    if (panel.dataset.busy === '1') return;
    panel.dataset.busy = '1';
    img.style.opacity = '.55';
    run().finally(() => {
      panel.dataset.busy = '0';
      img.style.opacity = '1';
    });
  });

  panel.append(img, status);
  document.documentElement.appendChild(panel);
})();
