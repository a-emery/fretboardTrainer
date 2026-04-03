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
const beatDots = [
  document.getElementById('dot1'),
  document.getElementById('dot2'),
  document.getElementById('dot3'),
  document.getElementById('dot4'),
];

let accentedBeat = 1; // Default to accenting the first beat
let audioUnlocked = false;
let bpm = Number(bpmInput.value) || 90;
let beat = 0;
let isRunning = false;
let lastTapTime = 0;
let tapIntervals = [];

// Create a synth for the metronome sound
const synth = new Tone.MonoSynth({
  oscillator: {
    type: "square"
  },
  envelope: {
    attack: 0.00001
  }
}).toDestination();
// const synth = new Tone.AMSynth().toDestination();

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
}

function updateBeatMeter(currentBeat) {
  beatDots.forEach((dot, index) => {
    const beatNumber = index + 1;
    dot.classList.toggle('active', beatNumber === currentBeat);
    dot.classList.toggle('accent-on', beatNumber === accentedBeat);
  });
}

function playClick() {
    if (!isRunning) return; // Prevent sound if metronome has been stopped
    const isAccent = (beat === accentedBeat);
    const note = isAccent ? 'G5' : 'C5';
    const velocity = isAccent ? 2 : 0.8;
  synth.triggerAttack(note, Tone.now(), velocity);
  synth.triggerRelease(Tone.now() + .05);
}

function tick() {
    if (!isRunning) return;

    // Advance the beat, looping from 1 to 4
    beat = (beat % 4) + 1;

    if (beat === 1) {
        pickNewCombination();
    }

    // Update UI for all beats
    cycleInfo.textContent = `Showing for 4 beats (beat ${beat}/4)`;
    updateBeatMeter(beat);
    
    // Play the click
    playClick();
}

function start() {
  if (isRunning) return;
  isRunning = true;
  toggleBtn.textContent = 'Stop';
  toggleBtn.disabled = false;
  bpm = Number(bpmInput.value);
  bpmEl.textContent = bpm;
  
  Tone.Transport.bpm.value = bpm;

  // Reset beat so the first tick starts at 1
  beat = 0; 

  // Schedule the tick function to be called on every beat.
  Tone.Transport.scheduleRepeat(time => {
    Tone.Draw.schedule(() => {
        tick();
    }, time);
  }, "4n");

  // Start the transport. The first tick will fire immediately.
  Tone.Transport.start();
}

function stop() {
  isRunning = false;
  toggleBtn.textContent = 'Start';
  beat = 0;
  cycleInfo.textContent = 'Stopped';
  updateBeatMeter(0);
  Tone.Transport.stop();
  Tone.Transport.cancel(); // Remove all scheduled events
}

function toggleStartStop() {
  if (isRunning) {
    stop();
    return;
  }

  if (!audioUnlocked) {
    toggleBtn.disabled = true;
    toggleBtn.textContent = 'Starting...';

    // Workaround for iOS silent mode. Playing and pausing a dummy audio element
    // categorizes the audio session as 'media', which bypasses the silent switch.
    const unlockAudioEl = document.getElementById('unlockAudio');
    if (unlockAudioEl) {
        const promise = unlockAudioEl.play();
        if (promise !== undefined) {
            promise.then(() => {
                unlockAudioEl.pause();
                unlockAudioEl.currentTime = 0;
            }).catch((error) => {
                console.warn("Dummy audio playback failed. This is OK on most platforms.", error);
            });
        }
    }
    
    Tone.start().then(() => {
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
    Tone.Transport.bpm.value = bpm;
  }
});

noteModeSelect.addEventListener('change', () => {
  if (isRunning) {
    // Immediately show a new combination by resetting the beat cycle
    beat = 0;
    tick();
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
      Tone.Transport.bpm.value = bpm;
    }
  } else {
    cycleInfo.textContent = 'Tap tempo: Tap again...';
  }
  lastTapTime = now;
}

toggleBtn.addEventListener('click', toggleStartStop);
tapBtn.addEventListener('click', tapTempo);

beatDots.forEach((dot, index) => {
  dot.addEventListener('click', () => {
    accentedBeat = index + 1;
    updateBeatMeter(beat); // Update display to show new accented beat
  });
});

cycleInfo.textContent = 'Press Start to begin';
updateBeatMeter(0); // Initialize beat meter display