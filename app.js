(() => {
  const gatewayUrlInput = document.getElementById('gatewayUrl');
  const apiTokenInput = document.getElementById('apiToken');
  const recipientsInput = document.getElementById('recipients');
  const messageInput = document.getElementById('message');
  const saveBtn = document.getElementById('saveConfig');
  const sendBtn = document.getElementById('sendBtn');
  const statusEl = document.getElementById('status');

  const STORAGE_KEYS = {
    gatewayUrl: 'traccar_gateway_url',
    apiToken: 'traccar_api_token'
  };

  function loadConfig() {
    const url = localStorage.getItem(STORAGE_KEYS.gatewayUrl) || '';
    const token = localStorage.getItem(STORAGE_KEYS.apiToken) || '';
    if (url) gatewayUrlInput.value = url;
    if (token) apiTokenInput.value = token;
  }

  function saveConfig() {
    const url = gatewayUrlInput.value.trim().replace(/\/$/, '');
    const token = apiTokenInput.value.trim();
    if (url) localStorage.setItem(STORAGE_KEYS.gatewayUrl, url);
    if (token) localStorage.setItem(STORAGE_KEYS.apiToken, token);
    setStatus('Settings saved.');
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function parseRecipients(text) {
    return text
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function toQuery(params) {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      usp.append(k, v);
    }
    return usp.toString();
  }

  async function sendSingleSms({ baseUrl, token, to, message }) {
    const url = `${baseUrl}/`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = token;

    const payload = { to, message };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) return { ok: true };
      // fall back to GET with query params (some setups block custom headers)
      const qp = toQuery({ to, message, token });
      const resGet = await fetch(`${baseUrl}/?${qp}`);
      return { ok: resGet.ok, status: resGet.status };
    } catch (e) {
      // Possible CORS or network error; attempt GET fallback as last resort
      try {
        const qp = toQuery({ to, message, token });
        const resGet = await fetch(`${baseUrl}/?${qp}`);
        return { ok: resGet.ok, status: resGet.status };
      } catch (e2) {
        return { ok: false, error: e2 };
      }
    }
  }

  async function onSend() {
    const baseUrl = (gatewayUrlInput.value || '').trim().replace(/\/$/, '');
    const token = (apiTokenInput.value || '').trim();
    const msg = (messageInput.value || '').trim();
    const recipients = parseRecipients(recipientsInput.value || '');

    if (!baseUrl) return setStatus('Please set Gateway Base URL.');
    if (!msg) return setStatus('Please enter a message.');
    if (!recipients.length) return setStatus('Please add at least one recipient.');

    sendBtn.disabled = true;
    setStatus('Sending...');

    const results = [];
    for (const to of recipients) {
      const r = await sendSingleSms({ baseUrl, token, to, message: msg });
      results.push({ to, ...r });
    }

    const okCount = results.filter(r => r.ok).length;
    const fail = results.filter(r => !r.ok);
    if (fail.length === 0) {
      setStatus(`Sent ${okCount}/${recipients.length} messages successfully.`);
    } else {
      const details = fail.map(f => `${f.to}${f.status ? ` (HTTP ${f.status})` : ''}`).join(', ');
      setStatus(`Sent ${okCount}/${recipients.length}. Failed: ${details}`);
    }

    sendBtn.disabled = false;
  }

  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    registerSW();
  });

  saveBtn.addEventListener('click', saveConfig);
  sendBtn.addEventListener('click', onSend);
})();

