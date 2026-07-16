(function () {
  var BACKEND_URL = window.LEADFLOW_URL || 'http://localhost:3001';
  var PRIMARY_COLOR = window.LEADFLOW_PRIMARY || '#0d6b6b';
  var COMPANY_NAME = window.LEADFLOW_COMPANY || 'LeadFlow';
  var WELCOME_MSG = window.LEADFLOW_WELCOME || 'Hi there! 👋 How can I help you today?';

  var sessionId = localStorage.getItem('leadflow_session') || 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  localStorage.setItem('leadflow_session', sessionId);
  var msgCount = 0;

  var styles = document.createElement('style');
  styles.textContent = `
.leadflow-btn {
  position: fixed; bottom: 24px; right: 24px; z-index: 999999;
  width: 56px; height: 56px; border-radius: 50%;
  background: ${PRIMARY_COLOR}; color: white; border: none;
  cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
  display: flex; align-items: center; justify-content: center;
}
.leadflow-btn:hover { transform: scale(1.05); box-shadow: 0 6px 28px rgba(0,0,0,0.25); }
.leadflow-btn svg { width: 26px; height: 26px; }
.leadflow-widget {
  position: fixed; bottom: 90px; right: 24px; z-index: 999999;
  width: 360px; max-height: 560px; height: 560px;
  background: white; border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.15);
  display: none; flex-direction: column; overflow: hidden;
  animation: leadflowIn 0.25s cubic-bezier(0.4,0,0.2,1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
@keyframes leadflowIn {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.leadflow-header {
  background: ${PRIMARY_COLOR}; color: white; padding: 16px 20px;
  display: flex; align-items: center; gap: 10px;
}
.leadflow-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(255,255,255,0.2); display: flex;
  align-items: center; justify-content: center;
  font-size: 16px; font-weight: 600;
}
.leadflow-header-text { flex: 1; }
.leadflow-header-text h3 { margin: 0; font-size: 14px; font-weight: 600; }
.leadflow-header-text p { margin: 2px 0 0; font-size: 11px; opacity: 0.85; }
.leadflow-close {
  background: none; border: none; color: white; cursor: pointer;
  opacity: 0.7; padding: 4px; border-radius: 4px;
}
.leadflow-close:hover { opacity: 1; background: rgba(255,255,255,0.1); }
.leadflow-messages {
  flex: 1; overflow-y: auto; padding: 16px;
  background: #f8fafc; display: flex; flex-direction: column; gap: 8px;
}
.leadflow-msg {
  max-width: 80%; padding: 10px 14px; border-radius: 12px;
  font-size: 13px; line-height: 1.5; word-wrap: break-word;
  animation: leadflowMsgIn 0.2s ease;
}
@keyframes leadflowMsgIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.leadflow-msg.bot {
  align-self: flex-start; background: white;
  color: #1e293b; border: 1px solid #e2e8f0;
  border-bottom-left-radius: 4px;
}
.leadflow-msg.user {
  align-self: flex-end; background: ${PRIMARY_COLOR};
  color: white; border-bottom-right-radius: 4px;
}
.leadflow-msg.user.loading {
  background: #cbd5e1; color: #64748b;
}
.leadflow-input-bar {
  padding: 12px 16px; border-top: 1px solid #e2e8f0;
  background: white; display: flex; gap: 8px;
}
.leadflow-input-bar input {
  flex: 1; border: 1px solid #e2e8f0; border-radius: 10px;
  padding: 10px 14px; font-size: 13px; outline: none;
  transition: border-color 0.2s;
}
.leadflow-input-bar input:focus { border-color: ${PRIMARY_COLOR}; }
.leadflow-input-bar button {
  width: 40px; height: 40px; border-radius: 10px; border: none;
  background: ${PRIMARY_COLOR}; color: white; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.2s; flex-shrink: 0;
}
.leadflow-input-bar button:hover { opacity: 0.9; }
.leadflow-input-bar button:disabled { opacity: 0.5; cursor: not-allowed; }
.leadflow-input-bar button svg { width: 18px; height: 18px; }
/* Tablet styles (640px - 1024px) */
@media (min-width: 640px) and (max-width: 1024px) {
  .leadflow-widget {
    width: 380px;
    max-height: 520px;
    height: 520px;
  }
}

/* Mobile styles (< 640px) */
@media (max-width: 639px) {
  .leadflow-btn {
    bottom: 16px;
    right: 16px;
    width: 52px;
    height: 52px;
  }
  .leadflow-btn svg {
    width: 24px;
    height: 24px;
  }
  .leadflow-widget {
    width: calc(100% - 16px);
    max-width: 100%;
    right: 8px;
    bottom: 76px;
    max-height: calc(100vh - 96px);
    height: auto;
    border-radius: 12px;
  }
  .leadflow-messages {
    padding: 12px;
  }
  .leadflow-input-bar {
    padding: 10px 12px;
  }
  .leadflow-input-bar input {
    font-size: 16px;
  }
}
`;
  document.head.appendChild(styles);

  var btn = document.createElement('button');
  btn.className = 'leadflow-btn';
  btn.id = 'leadflow-btn';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  document.body.appendChild(btn);

  var widget = document.createElement('div');
  widget.className = 'leadflow-widget';
  widget.id = 'leadflow-widget';
  widget.innerHTML = `
    <div class="leadflow-header">
      <div class="leadflow-avatar">${COMPANY_NAME[0]}</div>
      <div class="leadflow-header-text">
        <h3>${COMPANY_NAME}</h3>
        <p>Typically replies instantly</p>
      </div>
      <button class="leadflow-close" id="leadflow-close" aria-label="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="leadflow-messages" id="leadflow-msgs">
      <div class="leadflow-msg bot">${WELCOME_MSG}</div>
    </div>
    <div class="leadflow-input-bar">
      <input type="text" id="leadflow-input" placeholder="Type a message..." autocomplete="off">
      <button id="leadflow-send" aria-label="Send">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
  `;
  document.body.appendChild(widget);

  var input = document.getElementById('leadflow-input');
  var sendBtn = document.getElementById('leadflow-send');
  var msgsEl = document.getElementById('leadflow-msgs');
  var closeBtn = document.getElementById('leadflow-close');

  btn.addEventListener('click', function () {
    widget.style.display = 'flex';
    btn.style.display = 'none';
    input.focus();
    if (widget.style.height === 'auto') { msgsEl.scrollTop = msgsEl.scrollHeight; }
  });

  closeBtn.addEventListener('click', function () {
    widget.style.display = 'none';
    btn.style.display = 'flex';
  });

  function addMsg(text, type) {
    var div = document.createElement('div');
    div.className = 'leadflow-msg ' + type;
    div.textContent = text;
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function send() {
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMsg(text, 'user');
    var loading = document.createElement('div');
    loading.className = 'leadflow-msg user loading';
    loading.textContent = '...';
    msgsEl.appendChild(loading);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    sendBtn.disabled = true;

    var name = window.LEADFLOW_USER_NAME || '';
    var email = window.LEADFLOW_USER_EMAIL || '';

    var xhr = new XMLHttpRequest();
    xhr.open('POST', BACKEND_URL + '/chat/send', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      loading.remove();
      sendBtn.disabled = false;
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data.response) addMsg(data.response, 'bot');
          else addMsg('Thanks for reaching out! Our team will get back to you.', 'bot');
        } catch (e) {
          addMsg('Thanks for your message!', 'bot');
        }
      } else {
        addMsg('Sorry, I had trouble processing that. Please try again.', 'bot');
      }
    };
    xhr.onerror = function () {
      loading.remove();
      sendBtn.disabled = false;
      addMsg('Connection issue. Please try again.', 'bot');
    };
    xhr.send(JSON.stringify({
      sessionId: sessionId,
      name: name,
      email: email,
      message: text,
    }));
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
})();
