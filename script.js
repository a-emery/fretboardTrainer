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
const beatMeter = document.getElementById('beatMeter');
const dot1 = document.getElementById('dot1');

let isAccentEnabled = true;

let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let bpm = Number(bpmInput.value) || 90;
let beat = 0;
let currentTimeout = null;
let showCombinationInterval = null;
let currentString = null;
let currentNote = null;
let isRunning = false;
let lastTapTime = 0;
let tapIntervals = [];

function setupFirstGestureUnlock() {
  const unlock = async () => {
    await initAudioContext();
    document.body.removeEventListener('touchstart', unlock);
    document.body.removeEventListener('click', unlock);
  };

  document.body.addEventListener('touchstart', unlock, { once: true });
  document.body.addEventListener('click', unlock, { once: true });
}

setupFirstGestureUnlock();

async function initAudioContext() {
  await resumeAudioContext();
  // Unlock media channel on iOS
  const unlockAudio = document.getElementById('unlockAudio');
  if (unlockAudio) {
    unlockAudio.play().then(() => {
      unlockAudio.pause();
      unlockAudio.currentTime = 0;
    }).catch(() => {});
  }
}

async function resumeAudioContext() {
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getNotes() {
  const mode = noteModeSelect.value;

  if (mode === 'natural') {
    return naturalNotes;
  }

  if (mode === 'natural+sharps') {
    return [...naturalNotes, ...sharps];
  }

  if (mode === 'natural+flats') {
    return [...naturalNotes, ...flats];
  }

  // all
  return [...naturalNotes, ...sharps, ...flats];
}

function pickNewCombination() {
  currentString = randomItem(strings);
  currentNote = randomItem(getNotes());
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
  const playSound = () => {
    if (audioContext.state === 'running') {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'square';
      oscillator.frequency.value = isAccent ? 1200 : 1000;
      gain.gain.value = isAccent ? 0.25 : 0.15;

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.05);
    }
  };

  if (audioContext.state === 'suspended') {
    audioContext.resume().then(playSound);
  } else {
    playSound();
  }
}

function runMetronome() {
  const beatDurationMs = (60 / bpm) * 1000;

  if (currentTimeout) {
    clearTimeout(currentTimeout);
    currentTimeout = null;
  }

  const tick = () => {
    if (!isRunning) return;

    if (beat >= 4) {
      pickNewCombination();
    } else {
      beat += 1;
      cycleInfo.textContent = `Showing for 4 beats (beat ${beat}/4)`;
      updateBeatMeter(beat);
    }

    playClick(isAccentEnabled && beat === 1);

    currentTimeout = setTimeout(tick, beatDurationMs);
  };

  currentTimeout = setTimeout(tick, beatDurationMs);
}

async function start() {
  if (isRunning) return;

  await resumeAudioContext();

  isRunning = true;
  toggleBtn.textContent = 'Stop';

  bpm = Number(bpmInput.value);
  bpmEl.textContent = bpm;
  beat = 1;
  pickNewCombination();
  playClick(isAccentEnabled && beat === 1);

  runMetronome();
}

function stop() {
  isRunning = false;
  toggleBtn.textContent = 'Start';

  if (currentTimeout) {
    clearTimeout(currentTimeout);
    currentTimeout = null;
  }
  cycleInfo.textContent = 'Stopped';
  updateBeatMeter(0);
}

function toggleStartStop() {
  if (isRunning) {
    stop();
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
    runMetronome();
  }
});

noteModeSelect.addEventListener('change', () => {
  if (isRunning) {
    pickNewCombination();
  }
});

async function tapTempo() {
  const now = Date.now();

  if (lastTapTime && now - lastTapTime > 3000) {
    tapIntervals = [];
    cycleInfo.textContent = 'Tap tempo: first tap registered (keep tapping).';
    lastTapTime = now;
    return;
  }

  if (lastTapTime) {
    tapIntervals.push(now - lastTapTime);
    if (tapIntervals.length > 8) {
      tapIntervals.shift();
    }

    const averageMs = tapIntervals.reduce((sum, interval) => sum + interval, 0) / tapIntervals.length;
    const newBpm = Math.round(60000 / averageMs);
    bpm = Math.max(40, Math.min(240, newBpm));
    bpmInput.value = bpm;
    bpmEl.textContent = bpm;
    cycleInfo.textContent = `Tap tempo: ${bpm} BPM (${tapIntervals.length} taps)`;

    if (isRunning) {
      runMetronome();
    }
  } else {
    cycleInfo.textContent = 'Tap tempo: first tap registered (keep tapping).';
  }

  lastTapTime = now;
}

toggleBtn.addEventListener('click', toggleStartStop);
tapBtn.addEventListener('click', tapTempo);
dot1.addEventListener('click', async () => {
  isAccentEnabled = !isAccentEnabled;
  dot1.classList.toggle('accent-on');
});

cycleInfo.textContent = 'Press Start to begin';
updateBeatMeter(0);
dot1.classList.add('accent-on');