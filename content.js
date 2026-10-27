(() => {
  if (document.getElementById("cuda-ai-fab")) return;

  const KEEP_OPEN_WHEN_TYPING = true, HIDE_DELAY = 500;
  let hideTimer = null;

  function mount() {
    if (!document.body) return setTimeout(mount, 10);

    const fab = document.createElement("button");
    fab.id = "cuda-ai-fab";
    fab.type = "button";
    fab.setAttribute("aria-label", "Open CUDA AI");
    fab.innerHTML = `<span id="cuda-ai-fab-dot">AI</span>`;

    const chat = document.createElement("div");
    chat.id = "cuda-ai-chat";
    chat.innerHTML = `
      <div id="cuda-ai-header">
        <div id="cuda-ai-title">CUDA AI</div>
        <button id="cuda-ai-close" type="button" aria-label="Close">×</button>
      </div>
      <div id="cuda-ai-messages"><div class="cuda-message ai">Ask for simple CUDA code.</div></div>
      <div id="cuda-ai-input-area">
        <input id="cuda-ai-input" type="text" placeholder="Type request..." autocomplete="off" />
        <button id="cuda-ai-send" type="button">Send</button>
      </div>`;

    document.body.append(fab, chat);
    const messages = document.getElementById("cuda-ai-messages"),
          input = document.getElementById("cuda-ai-input"),
          sendBtn = document.getElementById("cuda-ai-send"),
          closeBtn = document.getElementById("cuda-ai-close");

    const isOpen = () => chat.style.display === "flex";
    const cancelHide = () => { if (hideTimer) clearTimeout(hideTimer); hideTimer = null; };
    const closeChat = () => { chat.style.display = "none"; cancelHide(); };
    const openChat = () => { chat.style.display = "flex"; cancelHide(); input.focus(); };
    const scheduleHide = (d = HIDE_DELAY) => { cancelHide(); hideTimer = setTimeout(closeChat, d); };

    fab.onclick = () => isOpen() ? closeChat() : openChat();
    closeBtn.onclick = closeChat;
    fab.onmouseenter = cancelHide;
    fab.onmouseleave = () => isOpen() && scheduleHide();
    chat.onmouseenter = cancelHide;
    chat.onmouseleave = () => { if (!(KEEP_OPEN_WHEN_TYPING && document.activeElement === input)) scheduleHide(); };

    document.addEventListener("mousedown", e => {
      if (isOpen() && !chat.contains(e.target) && !fab.contains(e.target)) closeChat();
    }, true);

    document.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen()) closeChat(); });

    const addMsg = (text, sender) => {
      const msg = document.createElement("div");
      msg.className = `cuda-message ${sender}`;
      msg.textContent = text;
      messages.append(msg);
      messages.scrollTop = messages.scrollHeight;
    };

    const addCodeReply = (text) => {
      const blocks = [...text.matchAll(/```[^\\r\\n`]*\\r?\\n([\\s\\S]*?)```/g)];
      const code = blocks.length ? blocks.map(m => m[1].replace(/\\r?\\n$/, "")).join("\\n\\n") : text;
      const msg = document.createElement("div");
      msg.className = "cuda-message ai";
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "cuda-copy-btn"; btn.textContent = "Copy";
      btn.onclick = async () => {
        btn.disabled = true;
        try { await navigator.clipboard.writeText(code); btn.textContent = "Copied!"; } 
        catch { btn.textContent = "Try again"; } 
        finally { 
          btn.disabled = false;
          setTimeout(() => btn.textContent = "Copy", 2000);
        }
      };
      msg.append(btn);
      messages.append(msg);
      messages.scrollTop = messages.scrollHeight;
    };

    const sendMsg = () => {
      const q = input.value.trim();
      if (!q) return;
      addMsg(q, "user");
      input.value = "";
      sendBtn.disabled = true; sendBtn.textContent = "...";
      chrome.runtime.sendMessage({ action: "chat", question: q }, (res) => {
        sendBtn.disabled = false; sendBtn.textContent = "Send";
        if (chrome.runtime.lastError) return addMsg("Extension error: " + chrome.runtime.lastError.message, "ai");
        if (res?.error) return addMsg("Error: " + res.error, "ai");
        res?.reply ? addCodeReply(res.reply) : addMsg("Empty response.", "ai");
      });
    };

    sendBtn.onclick = sendMsg;
    input.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); sendMsg(); } };
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", mount) : mount();
})();
