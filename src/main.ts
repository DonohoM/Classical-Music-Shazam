import "./styles.css";
import { startMicrophone, type MicSession } from "./audio/microphone";
import { detectPitch } from "./audio/pitchDetector";
import { frequencyToNote, midiToNoteName } from "./audio/noteUtils";
import { PitchClassHistogram, estimateKey } from "./audio/keyFinder";
import { MelodyRecorder } from "./audio/melodyRecorder";
import { loadThemes, toIntervals } from "./matching/database";
import { matchMelody } from "./matching/matcher";

const MIN_DISPLAY_CONFIDENCE = 0.5;
const MIN_FREQ = 60; // Hz, below typical hum/instrument range -> likely noise
const MAX_FREQ = 1200;

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const micToggle = $<HTMLButtonElement>("mic-toggle");
const micStatus = $<HTMLSpanElement>("mic-status");
const noteNameEl = $<HTMLSpanElement>("note-name");
const centsOffEl = $<HTMLSpanElement>("cents-off");
const frequencyEl = $<HTMLSpanElement>("frequency");
const keyNameEl = $<HTMLDivElement>("key-name");
const keyConfidenceEl = $<HTMLSpanElement>("key-confidence");
const melodyToggle = $<HTMLButtonElement>("melody-toggle");
const melodyClear = $<HTMLButtonElement>("melody-clear");
const melodyTrace = $<HTMLDivElement>("melody-trace");
const melodyResults = $<HTMLOListElement>("melody-results");
const dbCount = $<HTMLSpanElement>("db-count");

const themes = loadThemes();
dbCount.textContent = String(themes.length);

const histogram = new PitchClassHistogram();
const melodyRecorder = new MelodyRecorder();

let micSession: MicSession | null = null;
let recordingMelody = false;

function updateMelodyTrace() {
  const seq = melodyRecorder.getMidiSequence();
  melodyTrace.textContent =
    seq.length > 0 ? seq.map(midiToNoteName).join(" – ") : "(no notes yet)";
}

function renderMelodyResults(
  results: { theme: (typeof themes)[number]; score: number }[],
) {
  melodyResults.innerHTML = "";
  if (results.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No close matches found in the seed database.";
    melodyResults.appendChild(li);
    return;
  }
  for (const { theme, score } of results) {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>
        <span class="title">${theme.title}</span>
        <span class="composer">${theme.composer}</span>
      </span>
      <span class="score">${Math.round(score * 100)}%</span>
    `;
    melodyResults.appendChild(li);
  }
}

function onAudioFrame(samples: Float32Array, sampleRate: number) {
  const pitch = detectPitch(samples, sampleRate);

  const usable =
    pitch !== null &&
    pitch.confidence >= MIN_DISPLAY_CONFIDENCE &&
    pitch.frequency >= MIN_FREQ &&
    pitch.frequency <= MAX_FREQ;

  if (usable && pitch) {
    const note = frequencyToNote(pitch.frequency);
    noteNameEl.textContent = note.name;
    centsOffEl.textContent = `${note.centsOff >= 0 ? "+" : ""}${note.centsOff}¢`;
    frequencyEl.textContent = pitch.frequency.toFixed(1);
    histogram.add(note.pitchClass, pitch.confidence);
    if (recordingMelody) {
      melodyRecorder.addFrame(note, pitch.confidence);
      updateMelodyTrace();
    }
  } else {
    noteNameEl.textContent = "—";
    centsOffEl.textContent = "";
    frequencyEl.textContent = "—";
    if (recordingMelody) {
      melodyRecorder.addFrame(null, 0);
    }
  }

  if (histogram.totalWeight() > 2) {
    const key = estimateKey(histogram.snapshot());
    keyNameEl.textContent = key.name;
    keyConfidenceEl.textContent = `correlation: ${key.correlation.toFixed(2)}`;
  } else {
    keyNameEl.textContent = "—";
    keyConfidenceEl.textContent = "";
  }
}

async function startListening() {
  micStatus.textContent = "requesting mic access…";
  try {
    micSession = await startMicrophone(onAudioFrame);
  } catch (err) {
    micStatus.textContent = "mic access denied";
    console.error(err);
    return;
  }
  micStatus.textContent = "listening…";
  micToggle.textContent = "Stop Listening";
  melodyToggle.disabled = false;
  melodyClear.disabled = false;
}

function stopListening() {
  micSession?.stop();
  micSession = null;
  micStatus.textContent = "idle";
  micToggle.textContent = "Start Listening";
  melodyToggle.disabled = true;
  melodyClear.disabled = true;
  if (recordingMelody) {
    stopRecordingMelody();
  }
  noteNameEl.textContent = "—";
  centsOffEl.textContent = "";
  frequencyEl.textContent = "—";
  keyNameEl.textContent = "—";
  keyConfidenceEl.textContent = "";
}

function startRecordingMelody() {
  melodyRecorder.reset();
  recordingMelody = true;
  melodyToggle.textContent = "Stop Recording";
  melodyToggle.classList.add("recording");
  melodyResults.innerHTML = "";
  updateMelodyTrace();
}

function stopRecordingMelody() {
  recordingMelody = false;
  melodyToggle.textContent = "Record Melody";
  melodyToggle.classList.remove("recording");

  const midiSeq = melodyRecorder.getMidiSequence();
  if (midiSeq.length < 2) {
    melodyResults.innerHTML =
      '<li>Need at least 2 distinct notes to search — try again.</li>';
    return;
  }
  const intervals = toIntervals(midiSeq);
  const results = matchMelody(intervals, themes);
  renderMelodyResults(results);
}

micToggle.addEventListener("click", () => {
  if (micSession) {
    stopListening();
  } else {
    void startListening();
  }
});

melodyToggle.addEventListener("click", () => {
  if (recordingMelody) {
    stopRecordingMelody();
  } else {
    startRecordingMelody();
  }
});

melodyClear.addEventListener("click", () => {
  melodyRecorder.reset();
  updateMelodyTrace();
  melodyResults.innerHTML = "";
});
