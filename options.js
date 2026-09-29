const apiKeyInput = document.getElementById("apiKey");
const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("save");
const testBtn = document.getElementById("test");

function setStatus(message, type = "ok") {
  statusEl.textContent = message;
  statusEl.className = type;
}

chrome.storage.local.get(["apiKey"], (result) => {
  if (result.apiKey) {
    apiKeyInput.value = result.apiKey;
  }
});

saveBtn.addEventListener("click", () => {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    setStatus("Please enter an API key.", "err");
    return;
  }

  chrome.storage.local.set({ apiKey }, () => {
    setStatus("Saved.", "ok");
  });
});

testBtn.addEventListener("click", () => {
  setStatus("Testing...", "ok");

  chrome.runtime.sendMessage(
    {
      action: "chat",
      question: "Reply with exactly: OK"
    },
    (response) => {
      if (chrome.runtime.lastError) {
        setStatus("Extension error: " + chrome.runtime.lastError.message, "err");
        return;
      }

      if (response?.error) {
        setStatus("Error: " + response.error, "err");
        return;
      }

      setStatus("Success. Model replied: " + response?.reply, "ok");
    }
  );
});