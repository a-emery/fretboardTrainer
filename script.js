const strings = [1, 2, 3, 4, 5, 6];
const naturalNotes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const sharps = ['A#', 'C#', 'D#', 'F#', 'G#'];
const flats = ['Bb', 'Db', 'Eb', 'Gb', 'Ab'];

const stringEl = document.getElementById('string');
const noteEl = document.getElementById('note');
const bpmEl = document.getElementById('bpm');
const bpmInput = document.getElementById('bpmInput');
const noteModeSelect = document.getElementById('noteModeSelect');
const cycleInfo = document.getElementById('cycleInfo');
const toggleBtn = document.getElementById('toggleBtn');
const tapBtn = document.getElementById('tapBtn');
const dot1 = document.getElementById('dot1');

let isAccentEnabled = true;
let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioUnlocked = false;
let bpm = Number(bpmInput.value) || 90;
let beat = 0;
let currentTimeout = null;
let isRunning = false;
let lastTapTime = 0;
let tapIntervals = [];

async function initAudioContext() {
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getNotes() {
  const mode = noteModeSelect.value;
  if (mode === 'natural') return naturalNotes;
  if (mode === 'natural+sharps') return [...naturalNotes, ...sharps];
  if (mode === 'natural+flats') return [...naturalNotes, ...flats];
  return [...naturalNotes, ...sharps, ...flats];
}

function pickNewCombination() {
  const currentString = randomItem(strings);
  const currentNote = randomItem(getNotes());
  stringEl.textContent = currentString;
  noteEl.textContent = currentNote;
  cycleInfo.textContent = `Showing for 4 beats (beat 1/4)`;
  beat = 1;
  updateBeatMeter(beat);
}

function updateBeatMeter(beat) {
  for (let i = 1; i <= 4; i += 1) {
    const dot = document.getElementById(`dot${i}`);
    if (dot) {
      dot.classList.toggle('active', i === beat);
    }
  }
}

async function playClick(isAccent = false) {
  if (audioContext.state !== 'running') return;
  try {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = isAccent ? 1200 : 1000;
    gain.gain.value = isAccent ? 0.25 : 0.15;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
  } catch (e) {
    console.error('Error playing click sound:', e);
  }
}

function tick() {
  if (!isRunning) return;

  if (beat >= 4) {
    pickNewCombination();
  } else {
    beat += 1;
    cycleInfo.textContent = `Showing for 4 beats (beat ${beat}/4)`;
    updateBeatMeter(beat);
  }

  playClick(isAccentEnabled && beat === 1);

  const beatDurationMs = (60 / bpm) * 1000;
  currentTimeout = setTimeout(tick, beatDurationMs);
}

function start() {
  if (isRunning) return;
  isRunning = true;
  toggleBtn.textContent = 'Stop';
  toggleBtn.disabled = false;
  bpm = Number(bpmInput.value);
  bpmEl.textContent = bpm;

  // Immediately pick a combination, display it, and play the first beat.
  pickNewCombination();
  playClick(isAccentEnabled && beat === 1);

  // Schedule the next beat.
  const beatDurationMs = (60 / bpm) * 1000;
  currentTimeout = setTimeout(tick, beatDurationMs);
}

function stop() {
  isRunning = false;
  toggleBtn.textContent = 'Start';
  if (currentTimeout) {
    clearTimeout(currentTimeout);
    currentTimeout = null;
  }
  beat = 0;
  cycleInfo.textContent = 'Stopped';
  updateBeatMeter(0);
}

function toggleStartStop() {
  if (isRunning) {
    stop();
    return;
  }

  if (!audioUnlocked) {
    toggleBtn.disabled = true;
    toggleBtn.textContent = 'Starting...';
    
    initAudioContext().then(() => {
      audioUnlocked = true;
      start();
    }).catch(err => {
      cycleInfo.textContent = 'Error: Audio failed to start.';
      console.error('Audio unlock failed:', err);
      toggleBtn.disabled = false;
      toggleBtn.textContent = 'Start';
    });
  } else {
    start();
  }
}

bpmInput.addEventListener('input', () => {
  bpm = Number(bpmInput.value);
  bpmEl.textContent = bpm;
  lastTapTime = 0;
  tapIntervals = [];
  if (isRunning) {
    clearTimeout(currentTimeout);
    tick();
  }
});

noteModeSelect.addEventListener('change', () => {
  if (isRunning) {
    // Reset the beat cycle to show the new note immediately
    clearTimeout(currentTimeout);
    start();
  }
});

function tapTempo() {
  const now = Date.now();
  if (lastTapTime && now - lastTapTime > 3000) {
    tapIntervals = [];
  }
  if (lastTapTime) {
    tapIntervals.push(now - lastTapTime);
    if (tapIntervals.length > 8) tapIntervals.shift();
    const averageMs = tapIntervals.reduce((sum, interval) => sum + interval, 0) / tapIntervals.length;
    const newBpm = Math.round(60000 / averageMs);
    bpm = Math.max(40, Math.min(240, newBpm));
    bpmInput.value = bpm;
    bpmEl.textContent = bpm;
    cycleInfo.textContent = `Tap tempo: ${bpm} BPM`;
    if (isRunning) {
      clearTimeout(currentTimeout);
      tick();
    }
  } else {
    cycleInfo.textContent = 'Tap tempo: Tap again...';
  }
  lastTapTime = now;
}

toggleBtn.addEventListener('click', toggleStartStop);
tapBtn.addEventListener('click', tapTempo);
dot1.addEventListener('click', () => {
  isAccentEnabled = !isAccentEnabled;
  dot1.classList.toggle('accent-on');
});

cycleInfo.textContent = 'Press Start to begin';
updateBeatMeter(0);
dot1.classList.add('accent-on');