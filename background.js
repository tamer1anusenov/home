const API_URL = "https://llm.alem.ai/v1/chat/completions";
const MODEL = "qwen3-8";

// Hardcoded API key.
// Replace this with your NEW Alem.ai key.
const API_KEY = "sk-5CZXv8-fZxIWXJQIm-wenA";

const SYSTEM_PROMPT = `
You are a CUDA code assistant.

Your goal:
- Write simple, clear, brief, compile-ready CUDA code.
- Prefer minimal complete examples.
- If the user asks for a full program, include:
  - #include <cstdio>
  - #include <cuda_runtime.h>
  - CUDA error checking
  - kernel definition
  - main function
  - cudaMalloc / cudaMemcpy / kernel launch / cudaDeviceSynchronize / cudaFree when needed
- If the user asks for only a snippet, provide only the relevant snippet.
- Do not over-explain.
- If explanation is needed, keep it under 3 short sentences.
- Return code inside Markdown fenced code blocks.
- Use CUDA C/C++ syntax.
- Make the code as likely as possible to compile with nvcc.
`;

async function askLLM(question) {
  if (!API_KEY || API_KEY === "PASTE_YOUR_NEW_API_KEY_HERE") {
    throw new Error("API key is not set in background.js.");
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      stream: false,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: question
        }
      ]
    })
  });

  const text = await res.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message =
      data?.error?.message ||
      data?.error ||
      data?.message ||
      `HTTP ${res.status}`;

    throw new Error(message);
  }

  let reply =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text;

  if (Array.isArray(reply)) {
    reply = reply
      .map((part) => part?.text || "")
      .join("\n")
      .trim();
  }

  if (!reply) {
    throw new Error("Empty response from model.");
  }

  return reply;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== "chat") {
    return;
  }

  askLLM(request.question)
    .then((reply) => {
      sendResponse({ reply });
    })
    .catch((err) => {
      sendResponse({ error: err.message });
    });

  return true;
});