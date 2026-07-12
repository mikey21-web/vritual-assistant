/**
 * Embeddable web chat widget. Drop this on any client site:
 *
 *   <script src="https://<dashboard-host>/widget.js" data-site-key="..." data-api-url="https://<backend-host>"></script>
 *
 * No build step, no dependencies — plain JS + inline styles scoped under
 * #lva-widget-root so it can't collide with the host page's CSS.
 */
(function () {
  'use strict';

  var scriptTag = document.currentScript;
  if (!scriptTag) return;

  var siteKey = scriptTag.getAttribute('data-site-key');
  var apiUrl = (scriptTag.getAttribute('data-api-url') || '').replace(/\/$/, '');
  var greeting = scriptTag.getAttribute('data-greeting') || "Hi! Ask us anything.";
  var accent = scriptTag.getAttribute('data-accent') || '#0f766e';

  if (!siteKey || !apiUrl) {
    console.error('[web chat widget] data-site-key and data-api-url are required');
    return;
  }

  var STORAGE_KEY = 'lva_webchat_session_' + siteKey;
  var sessionId = localStorage.getItem(STORAGE_KEY);
  if (!sessionId) {
    sessionId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    localStorage.setItem(STORAGE_KEY, sessionId);
  }

  var state = {
    open: false,
    messages: [], // { id, text, direction: 'INBOUND'|'OUTBOUND', pending?: boolean }
    since: null,
    pollTimer: null,
  };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'style') node.setAttribute('style', attrs[k]);
      else if (k.indexOf('on') === 0) node[k] = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return node;
  }

  var root = el('div', { id: 'lva-widget-root' });
  var shadow = root.attachShadow ? root.attachShadow({ mode: 'open' }) : root;

  var style = el('style', {}, [
    '#panel{position:fixed;bottom:88px;right:20px;width:340px;max-width:calc(100vw - 32px);height:460px;max-height:calc(100vh - 140px);' +
    'background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;z-index:2147483000;}' +
    '#panel.open{display:flex;}' +
    '#header{background:' + accent + ';color:#fff;padding:14px 16px;font-size:14px;font-weight:600;display:flex;justify-content:space-between;align-items:center;}' +
    '#closeBtn{background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;opacity:.85;}' +
    '#closeBtn:hover{opacity:1;}' +
    '#messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f8fafc;}' +
    '.msg{max-width:78%;padding:8px 12px;border-radius:14px;font-size:13px;line-height:1.4;white-space:pre-wrap;word-break:break-word;}' +
    '.msg.out{align-self:flex-start;background:#fff;color:#1e293b;border:1px solid #e2e8f0;border-bottom-left-radius:4px;}' +
    '.msg.in{align-self:flex-end;background:' + accent + ';color:#fff;border-bottom-right-radius:4px;opacity:1;}' +
    '.msg.in.pending{opacity:.6;}' +
    '#composer{display:flex;gap:8px;padding:10px;border-top:1px solid #e2e8f0;background:#fff;}' +
    '#composer input{flex:1;border:1px solid #e2e8f0;border-radius:20px;padding:9px 14px;font-size:13px;outline:none;}' +
    '#composer input:focus{border-color:' + accent + ';}' +
    '#composer button{background:' + accent + ';color:#fff;border:none;border-radius:20px;padding:0 16px;font-size:13px;font-weight:600;cursor:pointer;}' +
    '#composer button:disabled{opacity:.5;cursor:default;}' +
    '#bubble{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:' + accent + ';' +
    'box-shadow:0 6px 20px rgba(0,0,0,.25);border:none;cursor:pointer;z-index:2147483000;display:flex;align-items:center;justify-content:center;}' +
    '#bubble svg{width:26px;height:26px;}',
  ]);

  var messagesEl = el('div', { id: 'messages' });
  var input = el('input', { type: 'text', placeholder: 'Type a message…' });
  var sendBtn = el('button', {}, ['Send']);
  var panel = el('div', { id: 'panel' }, [
    el('div', { id: 'header' }, [
      el('span', {}, ['Chat with us']),
      el('button', { id: 'closeBtn', onclick: function () { togglePanel(false); } }, ['✕']),
    ]),
    messagesEl,
    el('div', { id: 'composer' }, [input, sendBtn]),
  ]);

  var bubble = el('button', { id: 'bubble', 'aria-label': 'Open chat', onclick: function () { togglePanel(!state.open); } }, [
    (function () {
      var span = document.createElement('span');
      span.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
      return span;
    })(),
  ]);

  shadow.appendChild(style);
  shadow.appendChild(panel);
  shadow.appendChild(bubble);
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(root); });
  if (document.readyState === 'complete' || document.readyState === 'interactive') document.body.appendChild(root);

  function renderMessages() {
    messagesEl.innerHTML = '';
    if (state.messages.length === 0) {
      messagesEl.appendChild(el('div', { class: 'msg out' }, [greeting]));
    }
    state.messages.forEach(function (m) {
      var cls = 'msg ' + (m.direction === 'INBOUND' ? 'in' : 'out') + (m.pending ? ' pending' : '');
      messagesEl.appendChild(el('div', { class: cls }, [m.text]));
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function togglePanel(open) {
    state.open = open;
    panel.className = open ? 'open' : '';
    if (open) {
      renderMessages();
      poll();
      state.pollTimer = setInterval(poll, 4000);
      input.focus();
    } else if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  function poll() {
    var url = apiUrl + '/webhooks/webchat/' + encodeURIComponent(sessionId) + '/messages?siteKey=' + encodeURIComponent(siteKey);
    if (state.since) url += '&since=' + encodeURIComponent(state.since);
    fetch(url).then(function (r) { return r.ok ? r.json() : { data: [] }; }).then(function (body) {
      var incoming = body.data || [];
      if (incoming.length === 0) return;
      incoming.forEach(function (m) {
        // Drop the optimistic placeholder once the real message lands.
        if (m.direction === 'INBOUND') {
          var idx = state.messages.findIndex(function (x) { return x.pending && x.text === m.text; });
          if (idx !== -1) { state.messages.splice(idx, 1); }
        }
        state.messages.push({ id: m.id, text: m.text, direction: m.direction });
        if (m.createdAt && (!state.since || m.createdAt > state.since)) state.since = m.createdAt;
      });
      renderMessages();
    }).catch(function () {});
  }

  function send() {
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    sendBtn.disabled = true;
    state.messages.push({ id: 'local-' + Date.now(), text: text, direction: 'INBOUND', pending: true });
    renderMessages();

    fetch(apiUrl + '/webhooks/webchat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteKey: siteKey, sessionId: sessionId, text: text, messageId: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2) }),
    }).then(function () {
      poll();
    }).catch(function () {}).finally(function () {
      sendBtn.disabled = false;
    });
  }

  sendBtn.onclick = send;
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
})();
