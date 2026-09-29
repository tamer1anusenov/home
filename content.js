(() => {
  if (document.getElementById("cuda-ai-fab")) {
    return;
  }

  // If you want the chat to disappear even while typing when mouse leaves,
  // set this to false.
  const KEEP_OPEN_WHEN_TYPING = false;

  const HIDE_DELAY = 0;

  let hideTimer = null;

  function mount() {
    if (!document.body) {
      setTimeout(mount, 10);
      return;
    }

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

      <div id="cuda-ai-messages">
        <div class="cuda-message ai">Ask for simple CUDA code.</div>
      </div>

      <div id="cuda-ai-input-area">
        <input
          id="cuda-ai-input"
          type="text"
          placeholder="Type request..."
          autocomplete="off"
        />
        <button id="cuda-ai-send" type="button">Send</button>
      </div>
    `;

    document.body.append(fab, chat);

    const messages = document.getElementById("cuda-ai-messages");
    const input = document.getElementById("cuda-ai-input");
    const sendBtn = document.getElementById("cuda-ai-send");
    const closeBtn = document.getElementById("cuda-ai-close");

    function isOpen() {
      return chat.style.display === "flex";
    }

    function cancelHide() {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    }

    function scheduleHide(delay = HIDE_DELAY) {
      cancelHide();
      hideTimer = setTimeout(() => {
        closeChat();
      }, delay);
    }

    function openChat() {
      chat.style.display = "flex";
      cancelHide();
      input.focus();
    }

    function closeChat() {
      chat.style.display = "none";
      cancelHide();
    }

    function toggleChat() {
      if (isOpen()) {
        closeChat();
      } else {
        openChat();
      }
    }

    fab.addEventListener("click", toggleChat);

    closeBtn.addEventListener("click", () => {
      closeChat();
    });

    fab.addEventListener("mouseenter", cancelHide);
    fab.addEventListener("mouseleave", () => {
      if (isOpen()) {
        scheduleHide();
      }
    });

    chat.addEventListener("mouseenter", cancelHide);
    chat.addEventListener("mouseleave", () => {
      if (KEEP_OPEN_WHEN_TYPING && document.activeElement === input) {
        return;
      }

      scheduleHide();
    });

    document.addEventListener(
      "mousedown",
      (event) => {
        if (!isOpen()) return;

        const clickedInsideChat = chat.contains(event.target);
        const clickedFab = fab.contains(event.target);

        if (!clickedInsideChat && !clickedFab) {
          closeChat();
        }
      },
      true
    );

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) {
        closeChat();
      }
    });

    function addMessage(text, sender) {
      const msg = document.createElement("div");
      msg.className = `cuda-message ${sender}`;
      renderSimpleCodeBlocks(msg, text);
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
    }

    function renderSimpleCodeBlocks(container, text) {
      container.textContent = "";

      const regex = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          const normalText = text.slice(lastIndex, match.index).trim();
          if (normalText) {
            const p = document.createElement("div");
            p.textContent = normalText;
            container.appendChild(p);
          }
        }

        const language = match[1] || "text";
        const code = match[2].trim();

        const pre = document.createElement("pre");
        const codeEl = document.createElement("code");
        codeEl.className = `language-${language}`;
        codeEl.textContent = code;

        pre.appendChild(codeEl);
        container.appendChild(pre);

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        const remaining = text.slice(lastIndex).trim();
        if (remaining) {
          const p = document.createElement("div");
          p.textContent = remaining;
          container.appendChild(p);
        }
      }
    }

    function sendMessage() {
      const question = input.value.trim();
      if (!question) return;

      addMessage(question, "user");
      input.value = "";
      sendBtn.disabled = true;
      sendBtn.textContent = "...";

      chrome.runtime.sendMessage(
        {
          action: "chat",
          question
        },
        (response) => {
          sendBtn.disabled = false;
          sendBtn.textContent = "Send";

          if (chrome.runtime.lastError) {
            addMessage("Extension error: " + chrome.runtime.lastError.message, "ai");
            return;
          }

          if (response?.error) {
            addMessage("Error: " + response.error, "ai");
            return;
          }

          addMessage(response?.reply || "Empty response.", "ai");
        }
      );
    }

    sendBtn.addEventListener("click", sendMessage);

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();