const state = {
  messages: 0,
  memory: 0,
  busy: false,
  mode: "checking",
  history: [],
  voice: {
    supported: false,
    enabled: false,
    listening: false,
    speaking: false,
    activatedAt: 0,
    commandModeUntil: 0,
    wakeWord: "jarvis",
    commandWindowMs: 6000,
    recognition: null,
    stopRequested: false,
    pendingCommand: "",
    lastFinalTranscript: "",
    lastFinalAt: 0,
    lastSubmittedCommand: "",
    lastSubmittedAt: 0,
  },
};

const elements = {};
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

window.addEventListener("DOMContentLoaded", () => {
  elements.form = document.getElementById("chatForm");
  elements.input = document.getElementById("chatInput");
  elements.transcript = document.getElementById("transcript");
  elements.thinking = document.getElementById("thinkingRow");
  elements.core = document.getElementById("core");
  elements.statusEngine = document.getElementById("statusEngine");
  elements.statusVoice = document.getElementById("statusVoice");
  elements.statusMessages = document.getElementById("statusMessages");
  elements.statusMemory = document.getElementById("statusMemory");
  elements.statusNote = document.getElementById("statusNote");
  elements.voiceToggle = document.getElementById("voiceToggle");
  elements.connBadge = document.getElementById("connBadge");
  elements.connLabel = document.getElementById("connLabel");
  elements.about = document.getElementById("aboutDialog");
  elements.demoNote = document.getElementById("demoNote");

  document.getElementById("year").textContent = String(new Date().getFullYear());

  initAbout();
  initSuggestions();
  initVoiceActivation();
  detectBackend();

  elements.form.addEventListener("submit", onSubmit);
  elements.voiceToggle.addEventListener("click", toggleVoiceActivation);
});

function initAbout() {
  document.getElementById("aboutOpen").addEventListener("click", () => elements.about.showModal());
  document.getElementById("aboutClose").addEventListener("click", () => elements.about.close());
  elements.about.addEventListener("click", (event) => {
    if (event.target === elements.about) {
      elements.about.close();
    }
  });
  if (window.location.hash === "#about") {
    elements.about.showModal();
  }
}

function initSuggestions() {
  document.getElementById("suggestions").addEventListener("click", (event) => {
    const chip = event.target.closest("[data-prompt]");
    if (!chip || state.busy) {
      return;
    }
    elements.input.value = chip.dataset.prompt;
    elements.form.requestSubmit();
  });
}

async function detectBackend() {
  try {
    const response = await fetch("/health", { cache: "no-store" });
    const data = response.ok ? await response.json() : null;
    if (data?.status === "ok") {
      setMode("live", data.engine === "llm" ? "LLM" : "Local");
      state.memory = data.memory ?? 0;
    } else {
      setMode("demo", "Demo");
    }
  } catch (error) {
    void error;
    setMode("demo", "Demo");
  }

  const greeting = state.mode === "live"
    ? "JARVIS online. Backend connected. Type a message, or turn on voice and say “Hey Jarvis”."
    : "JARVIS online in demo mode. Ask me what I can do, or try one of the commands on the left.";
  await renderAssistant(greeting, "", { speak: false });
}

function setMode(mode, engine) {
  state.mode = mode;
  elements.connBadge.dataset.state = mode;
  elements.connLabel.textContent = mode === "live" ? "Live backend" : "Demo mode";
  elements.demoNote.hidden = mode === "live";
  elements.statusEngine.textContent = engine;
  syncStatus();
}

function initVoiceActivation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    elements.voiceToggle.disabled = true;
    elements.voiceToggle.title = "Voice needs Chrome or Edge";
    elements.statusVoice.textContent = "Unsupported";
    return;
  }

  state.voice.supported = true;
  state.voice.recognition = new SpeechRecognition();
  state.voice.recognition.continuous = true;
  state.voice.recognition.interimResults = true;
  state.voice.recognition.lang = "en-US";
  state.voice.recognition.onresult = onVoiceResult;
  state.voice.recognition.onend = onVoiceEnd;
  state.voice.recognition.onerror = onVoiceError;
}

function toggleVoiceActivation() {
  if (!state.voice.supported || !state.voice.recognition) {
    return;
  }

  if (state.voice.enabled) {
    stopVoiceActivation();
    return;
  }

  startVoiceActivation();
}

function startVoiceActivation() {
  state.voice.enabled = true;
  state.voice.stopRequested = false;
  elements.voiceToggle.classList.add("is-active");
  elements.voiceToggle.setAttribute("aria-pressed", "true");
  setVoiceStatus("Say “Hey Jarvis”");
  safeStartRecognition();
}

function stopVoiceActivation() {
  state.voice.enabled = false;
  state.voice.stopRequested = true;
  state.voice.activatedAt = 0;
  elements.voiceToggle.classList.remove("is-active");
  elements.voiceToggle.setAttribute("aria-pressed", "false");
  setVoiceStatus("Standby");
  if (state.voice.recognition) {
    try {
      state.voice.recognition.stop();
    } catch (error) {
      void error;
    }
  }
}

function setVoiceStatus(text) {
  elements.statusVoice.textContent = text;
}

function safeStartRecognition() {
  if (!state.voice.recognition || !state.voice.enabled || state.voice.listening || state.voice.speaking) {
    return;
  }

  try {
    state.voice.recognition.start();
    state.voice.listening = true;
    elements.voiceToggle.classList.add("is-listening");
  } catch (error) {
    void error;
  }
}

function stripWakeWord(transcript) {
  return transcript.replace(new RegExp(`^.*?${state.voice.wakeWord}[,\\s:.!]*`, "i"), "").trim();
}

function onVoiceResult(event) {
  if (state.voice.speaking) {
    return;
  }

  let finalTranscript = "";

  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    const transcript = result[0]?.transcript?.trim() || "";
    if (!transcript) {
      continue;
    }
    if (result.isFinal) {
      finalTranscript = `${finalTranscript} ${transcript}`.trim();
    }
  }

  const transcript = finalTranscript.trim();
  if (!transcript) {
    return;
  }

  const now = Date.now();
  if (transcript === state.voice.lastFinalTranscript && now - state.voice.lastFinalAt < 1200) {
    return;
  }
  state.voice.lastFinalTranscript = transcript;
  state.voice.lastFinalAt = now;

  const lower = transcript.toLowerCase();
  const inCommandWindow = state.voice.activatedAt && now <= state.voice.commandModeUntil;

  if (!inCommandWindow && lower.includes(state.voice.wakeWord)) {
    state.voice.activatedAt = now;
    state.voice.commandModeUntil = now + state.voice.commandWindowMs;
    setVoiceStatus("Listening…");
    pulseCore();

    const commandText = stripWakeWord(transcript);
    if (commandText) {
      submitVoiceCommand(commandText);
    }
    return;
  }

  if (inCommandWindow) {
    const commandText = stripWakeWord(transcript) || transcript;
    state.voice.commandModeUntil = now + state.voice.commandWindowMs;
    submitVoiceCommand(commandText);
  }
}

function submitVoiceCommand(message) {
  if (!message || state.busy) {
    state.voice.pendingCommand = message || state.voice.pendingCommand;
    return;
  }

  if (message === state.voice.lastSubmittedCommand && Date.now() - state.voice.lastSubmittedAt < 1200) {
    return;
  }

  elements.input.value = message;
  state.voice.pendingCommand = "";
  state.voice.lastSubmittedCommand = message;
  state.voice.lastSubmittedAt = Date.now();
  elements.form.requestSubmit();
}

function onVoiceEnd() {
  state.voice.listening = false;
  elements.voiceToggle.classList.remove("is-listening");
  if (state.voice.stopRequested) {
    return;
  }
  if (state.voice.enabled) {
    safeStartRecognition();
  }
}

function onVoiceError(event) {
  state.voice.listening = false;
  elements.voiceToggle.classList.remove("is-listening");
  if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
    stopVoiceActivation();
    setVoiceStatus("Mic blocked");
  }
}

async function onSubmit(event) {
  event.preventDefault();
  const message = elements.input.value.trim();
  if (!message || state.busy) {
    return;
  }

  elements.input.value = "";
  setBusy(true);
  addMessage("user", message);

  try {
    let payload;
    if (state.mode === "live") {
      try {
        payload = await requestChat(message);
      } catch (error) {
        void error;
        setMode("demo", "Demo");
        payload = getDemoResponse(message);
      }
    } else {
      await sleep(420 + Math.random() * 380);
      payload = getDemoResponse(message);
      state.memory = Math.min(state.memory + 2, 24);
    }

    if (payload.memory !== undefined) {
      state.memory = payload.memory;
    }
    setBusy(false);
    await renderAssistant(payload.reply || "", payload.command_result || "");

    state.history.push(message);
    if (state.history.length > 12) {
      state.history.shift();
    }
  } finally {
    setBusy(false);
    if (state.voice.pendingCommand) {
      const pendingCommand = state.voice.pendingCommand;
      state.voice.pendingCommand = "";
      window.setTimeout(() => submitVoiceCommand(pendingCommand), 0);
    }
  }
}

function setBusy(busy) {
  state.busy = busy;
  elements.thinking.hidden = !busy;
  elements.core.classList.toggle("is-thinking", busy);
  elements.statusNote.textContent = busy ? "Routing through command parser…" : "Awaiting input.";
}

async function requestChat(message) {
  const response = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history: state.history }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed with ${response.status}`);
  }

  return response.json();
}

function addMessage(role, text) {
  const item = document.createElement("article");
  item.className = `msg is-${role}`;

  const label = document.createElement("div");
  label.className = "msg-label";
  label.textContent = role === "user" ? "You" : role === "assistant" ? "JARVIS" : "Command";

  const body = document.createElement("div");
  body.className = "msg-body";
  if (text) {
    body.textContent = text;
  }

  item.append(label, body);
  elements.transcript.appendChild(item);
  state.messages += 1;
  syncStatus();
  scrollToEnd();
  return body;
}

async function renderAssistant(text, commandResult, { speak = true } = {}) {
  const body = addMessage("assistant", "");
  const words = splitIntoWords(text);
  for (let index = 0; index < words.length; index += 1) {
    const token = document.createElement("span");
    token.className = "token";
    token.textContent = words[index];
    body.append(token, " ");
    if (!reducedMotion) {
      await sleep(26);
    }
    if (index % 8 === 0) {
      scrollToEnd();
    }
  }

  if (commandResult) {
    addMessage("system", commandResult);
  }
  scrollToEnd();

  if (speak) {
    speakReply(text);
  }
}

function scrollToEnd() {
  elements.transcript.scrollTo({ top: elements.transcript.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
}

function pulseCore() {
  elements.core.classList.remove("is-waking");
  void elements.core.offsetWidth;
  elements.core.classList.add("is-waking");
}

function splitIntoWords(text) {
  return (text || "").match(/\S+/g) || [];
}

function speakReply(text) {
  if (!("speechSynthesis" in window) || !text || !state.voice.enabled) {
    return;
  }

  state.voice.speaking = true;
  elements.voiceToggle.classList.add("is-speaking");
  setVoiceStatus("Speaking");
  if (state.voice.recognition && state.voice.listening) {
    try {
      state.voice.recognition.stop();
    } catch (error) {
      void error;
    }
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.02;
  utterance.pitch = 0.98;
  utterance.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((voice) => /en/i.test(voice.lang) && /(zira|samantha|hazel|female)/i.test(voice.name));
  if (preferred) {
    utterance.voice = preferred;
  }
  const resume = () => {
    state.voice.speaking = false;
    elements.voiceToggle.classList.remove("is-speaking");
    if (state.voice.enabled && !state.voice.stopRequested) {
      setVoiceStatus("Say “Hey Jarvis”");
      window.setTimeout(() => safeStartRecognition(), 250);
    }
  };
  utterance.onend = resume;
  utterance.onerror = resume;
  window.speechSynthesis.speak(utterance);
}

// Scripted replies for the public demo, where no Python backend is running.
// Commands are described, never executed.
function getDemoResponse(message) {
  const lower = message.toLowerCase().trim();

  if (lower.startsWith("open browser") || lower.startsWith("browser")) {
    const target = message.replace(/^(open\s+)?browser[\s:,-]*/i, "").trim() || "google.com";
    return {
      reply: `In a local install I would open ${target} in your default browser. This is the demo, so I'll leave your tabs alone.`,
      command_result: `open_browser → ${target} (simulated)`,
    };
  }
  if (lower.startsWith("search web")) {
    const query = message.slice("search web".length).replace(/^[\s:,-]+/, "") || "latest AI news";
    return {
      reply: `Search queued for “${query}”. Locally, that opens a results page in your browser.`,
      command_result: `search_web → ${query} (simulated)`,
    };
  }
  if (lower.startsWith("run code")) {
    const code = message.slice("run code".length).trim();
    return {
      reply: "The local executor runs Python snippets in a separate interpreter process with a 20 second timeout. The demo doesn't run code, but here is the command it would send.",
      command_result: `run_code → ${code || "(no snippet)"} (simulated)`,
    };
  }
  if (lower.startsWith("create file")) {
    const target = message.slice("create file".length).split("|")[0].trim() || "notes.txt";
    return {
      reply: `Locally I would write ${target} to disk. The demo keeps your filesystem untouched.`,
      command_result: `create_file → ${target} (simulated)`,
    };
  }
  if (/(who (built|made|created)|moratamotho|your (creator|maker))/.test(lower)) {
    return {
      reply: "I was designed and built by MoratamothoDevs, a South African software studio. You can find them at moratamothodevs.co.za.",
    };
  }
  if (/(what can you do|help|capabilit|features)/.test(lower)) {
    return {
      reply: "I handle conversation through any OpenAI-compatible model, remember recent context, and run desktop commands: open browser, search web, create file, and run code. Turn on voice and say “Hey Jarvis” for hands-free control.",
    };
  }
  if (/(how .*work|architecture|stack|built with|tech)/.test(lower)) {
    return {
      reply: "This interface is plain HTML, CSS and JavaScript. Locally it talks to a standard-library Python server, which routes each message through a command parser, an executor, a JSON memory store, and the language model client.",
    };
  }
  if (/(hire|contact|work with|quote|project)/.test(lower)) {
    return {
      reply: "For custom assistants, web platforms or automation work, contact MoratamothoDevs through moratamothodevs.co.za.",
    };
  }
  if (/\btime\b/.test(lower)) {
    return { reply: `Local time is ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.` };
  }
  if (/^(hi|hello|hey)\b/.test(lower)) {
    return { reply: "Acknowledged. I am online and awaiting instructions." };
  }
  return {
    reply: `Recorded: “${message}”. In demo mode my replies are scripted. Connect the local backend with an API key for full model responses.`,
  };
}

function syncStatus() {
  elements.statusMessages.textContent = String(state.messages);
  elements.statusMemory.textContent = String(state.memory);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
