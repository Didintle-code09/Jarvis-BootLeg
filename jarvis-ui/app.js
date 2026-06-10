const state = {
  blocks: 0,
  memory: 0,
  busy: false,
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

window.addEventListener("DOMContentLoaded", () => {
  elements.form = document.getElementById("chatForm");
  elements.input = document.getElementById("chatInput");
  elements.grid = document.getElementById("moduleGrid");
  elements.statusMode = document.getElementById("statusMode");
  elements.statusEngine = document.getElementById("statusEngine");
  elements.statusBlocks = document.getElementById("statusBlocks");
  elements.statusMemory = document.getElementById("statusMemory");
  elements.statusNote = document.getElementById("statusNote");
  elements.voiceToggle = document.getElementById("voiceToggle");
  elements.voiceChip = document.getElementById("voiceChip");

  seedWelcomeBlocks();
  initVoiceActivation();

  elements.form.addEventListener("submit", onSubmit);
  elements.voiceToggle.addEventListener("click", toggleVoiceActivation);
});

function seedWelcomeBlocks() {
  addBlock({ role: "system", text: "boot" }, { kind: "intro", tokenIndex: 0 });
  addBlock({ role: "system", text: "silence" }, { kind: "intro", tokenIndex: 1 });
  updateStatus("", "", "");
}

function initVoiceActivation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    elements.voiceToggle.disabled = true;
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
  safeStartRecognition();
}

function stopVoiceActivation() {
  state.voice.enabled = false;
  state.voice.stopRequested = true;
  state.voice.activatedAt = 0;
  elements.voiceToggle.classList.remove("is-active");
  if (state.voice.recognition) {
    try {
      state.voice.recognition.stop();
    } catch (error) {
      void error;
    }
  }
}

function safeStartRecognition() {
  if (!state.voice.recognition || !state.voice.enabled || state.voice.listening || state.voice.speaking) {
    return;
  }

  try {
    state.voice.recognition.start();
    state.voice.listening = true;
  } catch (error) {
    void error;
  }
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
  if (!state.voice.activatedAt && lower.includes(state.voice.wakeWord)) {
    state.voice.activatedAt = now;
    state.voice.commandModeUntil = now + state.voice.commandWindowMs;
    addBlock({ role: "system", text: "wake" }, { kind: "activation", tokenIndex: state.blocks });

    const commandText = transcript.replace(new RegExp(`^.*${state.voice.wakeWord}[,\s:]*`, "i"), "").trim();
    if (commandText) {
      submitVoiceCommand(commandText);
    }
    return;
  }

  if (state.voice.activatedAt && Date.now() <= state.voice.commandModeUntil) {
    const commandText = transcript.replace(new RegExp(`^.*${state.voice.wakeWord}[,\s:]*`, "i"), "").trim() || transcript;
    if (commandText) {
      state.voice.commandModeUntil = Date.now() + state.voice.commandWindowMs;
      submitVoiceCommand(commandText);
    }
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
  if (state.voice.stopRequested) {
    return;
  }
  if (state.voice.enabled) {
    safeStartRecognition();
  }
}

function onVoiceError() {
  state.voice.listening = false;
}

async function onSubmit(event) {
  event.preventDefault();
  const message = elements.input.value.trim();
  if (!message || state.busy) {
    return;
  }

  elements.input.value = "";
  state.busy = true;

  addBlock({ role: "user", text: message }, { kind: "input", tokenIndex: state.blocks });

  try {
    const payload = await requestChat(message);
    state.memory = payload.memory ?? state.memory;
    const replyText = payload.reply || "";
    await renderWordBlocks(replyText, payload.command_result || "");
    speakReply(replyText);
    state.history.push(message);
    if (state.history.length > 12) {
      state.history.shift();
    }
  } catch (error) {
    const fallback = getMockResponse(message);
    await renderWordBlocks(fallback.reply, fallback.command_result || "");
    speakReply(fallback.reply);
  } finally {
    state.busy = false;
    if (state.voice.pendingCommand) {
      const pendingCommand = state.voice.pendingCommand;
      state.voice.pendingCommand = "";
      window.setTimeout(() => submitVoiceCommand(pendingCommand), 0);
    }
  }
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

async function renderWordBlocks(text, commandResult) {
  const words = splitIntoWords(text);
  for (let index = 0; index < words.length; index += 1) {
    addBlock({ role: "assistant", text: words[index] }, { kind: "word", tokenIndex: state.blocks + index });
    await sleep(34);
  }

  const actionWords = splitIntoWords(commandResult);
  for (let index = 0; index < actionWords.length; index += 1) {
    addBlock({ role: "system", text: actionWords[index] }, { kind: "word", tokenIndex: state.blocks + 200 + index });
    await sleep(28);
  }
}

function addBlock({ role, text }, options = {}) {
  const block = document.createElement("article");
  const kind = options.kind || "word";
  const tokenIndex = options.tokenIndex || 0;
  const length = Math.max(1, (text || "").length);

  block.className = ["module-block", `is-${role}`, `is-${kind}`].join(" ");
  block.dataset.expanded = "false";
  block.dataset.word = text || "";
  block.setAttribute("aria-label", text || role);

  const driftX = ((tokenIndex % 5) - 2) * 8;
  const driftY = ((tokenIndex % 3) - 1) * 6;
  const duration = 4.8 + (tokenIndex % 4) * 0.6;
  const delay = (tokenIndex % 6) * 0.08;
  block.style.setProperty("--drift-x", `${driftX}px`);
  block.style.setProperty("--drift-y", `${driftY}px`);
  block.style.setProperty("--float-duration", `${duration}s`);
  block.style.setProperty("--float-delay", `${delay}s`);
  block.style.setProperty("--block-width", `${Math.min(240, 72 + length * 10)}px`);
  block.style.setProperty("--block-height", `${Math.min(120, 34 + Math.ceil(length / 3) * 12)}px`);
  block.style.setProperty("--pulse-delay", `${(tokenIndex % 7) * 0.12}s`);

  const core = document.createElement("div");
  core.className = "module-core";

  const pulse = document.createElement("div");
  pulse.className = "module-pulse";

  const tracks = document.createElement("div");
  tracks.className = "module-tracks";

  const trackCount = Math.max(3, Math.min(8, Math.ceil(length / 2)));
  for (let index = 0; index < trackCount; index += 1) {
    const track = document.createElement("span");
    track.className = "module-track";
    track.style.setProperty("--track-index", String(index));
    track.style.setProperty("--track-width", `${48 + ((index + length) % 6) * 8}%`);
    tracks.appendChild(track);
  }

  core.append(pulse, tracks);
  block.append(core);
  elements.grid.appendChild(block);
  state.blocks += 1;
  syncStatus();
  elements.grid.scrollTo({ top: elements.grid.scrollHeight, behavior: "smooth" });
  return block;
}

function splitIntoWords(text) {
  return (text || "").match(/\S+/g) || [];
}

function speakReply(text) {
  if (!("speechSynthesis" in window) || !text) {
    return;
  }

  state.voice.speaking = true;
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
  utterance.onend = () => {
    state.voice.speaking = false;
    if (state.voice.enabled && !state.voice.stopRequested) {
      window.setTimeout(() => safeStartRecognition(), 250);
    }
  };
  utterance.onerror = () => {
    state.voice.speaking = false;
    if (state.voice.enabled && !state.voice.stopRequested) {
      window.setTimeout(() => safeStartRecognition(), 250);
    }
  };
  window.speechSynthesis.speak(utterance);
}

function getMockResponse(message) {
  if (/open browser/i.test(message)) {
    return { reply: "Browser command acknowledged.", command_result: "" };
  }
  if (/create file/i.test(message)) {
    return { reply: "File command acknowledged.", command_result: "" };
  }
  return { reply: `Processed ${message}.`, command_result: "" };
}

function updateStatus(mode, engine, note) {
  if (elements.statusMode) {
    elements.statusMode.textContent = mode || "";
  }
  if (elements.statusEngine) {
    elements.statusEngine.textContent = engine || "";
  }
  if (elements.statusNote) {
    elements.statusNote.textContent = note || "";
  }
  syncStatus();
}

function syncStatus() {
  if (elements.statusBlocks) {
    elements.statusBlocks.textContent = String(state.blocks);
  }
  if (elements.statusMemory) {
    elements.statusMemory.textContent = String(state.memory);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
