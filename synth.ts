// A collection of functions to generate synthetic drum sounds using the Web Audio API.

const generateNoteFrequencies = (): { [key: string]: number } => {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const frequencies: { [key: string]: number } = {};
  const A4 = 440;
  const A4_MIDI = 69;

  for (let octave = 0; octave < 10; octave++) {
    for (let i = 0; i < 12; i++) {
      const noteName = noteNames[i] + octave;
      const midiNumber = 12 + (octave * 12) + i;
      if (midiNumber > 127) continue;
      const frequency = A4 * Math.pow(2, (midiNumber - A4_MIDI) / 12);
      frequencies[noteName] = frequency;
    }
  }
  return frequencies;
};

const noteFrequencies = generateNoteFrequencies();

export const noteToFrequency = (note: string): number => {
  return noteFrequencies[note] || 440;
};

export const playMelodicNote = (audioContext: AudioContext, time: number, frequency: number, duration: number, type: 'piano' | 'guitar') => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);

    if (type === 'piano') {
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration * 0.8);
    } else { // guitar
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
    }

    osc.frequency.setValueAtTime(frequency, time);
    osc.start(time);
    osc.stop(time + duration);
};


export const playKick = (audioContext: AudioContext, time: number) => {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

  gain.gain.setValueAtTime(1, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

  osc.start(time);
  osc.stop(time + 0.5);
};

export const playSnare = (audioContext: AudioContext, time: number) => {
  const noise = audioContext.createBufferSource();
  const bufferSize = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  noise.buffer = buffer;

  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(1000, time);
  noise.connect(noiseFilter);

  const noiseEnvelope = audioContext.createGain();
  noiseFilter.connect(noiseEnvelope);
  noiseEnvelope.connect(audioContext.destination);

  const osc = audioContext.createOscillator();
  osc.type = 'triangle';
  const oscEnvelope = audioContext.createGain();
  osc.connect(oscEnvelope);
  oscEnvelope.connect(audioContext.destination);
  
  noiseEnvelope.gain.setValueAtTime(1, time);
  noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
  noise.start(time);

  osc.frequency.setValueAtTime(100, time);
  oscEnvelope.gain.setValueAtTime(0.7, time);
  oscEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
  osc.start(time);

  osc.stop(time + 0.2);
  noise.stop(time + 0.2);
};

export const playHiHat = (audioContext: AudioContext, time: number) => {
  const noise = audioContext.createBufferSource();
  const bufferSize = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  noise.buffer = buffer;

  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(7000, time);
  noise.connect(noiseFilter);

  const noiseEnvelope = audioContext.createGain();
  noiseFilter.connect(noiseEnvelope);
  noiseEnvelope.connect(audioContext.destination);

  noiseEnvelope.gain.setValueAtTime(1, time);
  noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
  noise.start(time);
  noise.stop(time + 0.05);
};

export const playClap = (audioContext: AudioContext, time: number) => {
  const noise = audioContext.createBufferSource();
  const bufferSize = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  noise.buffer = buffer;

  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(1000, time);
  noiseFilter.Q.setValueAtTime(10, time);
  noise.connect(noiseFilter);

  const noiseEnvelope = audioContext.createGain();
  noiseFilter.connect(noiseEnvelope);
  noiseEnvelope.connect(audioContext.destination);

  noiseEnvelope.gain.setValueAtTime(0, time);
  noiseEnvelope.gain.linearRampToValueAtTime(1, time + 0.01);
  noiseEnvelope.gain.exponentialRampToValueAtTime(0.3, time + 0.02);
  noiseEnvelope.gain.linearRampToValueAtTime(1, time + 0.03);
  noiseEnvelope.gain.exponentialRampToValueAtTime(0.3, time + 0.04);
  noiseEnvelope.gain.linearRampToValueAtTime(1, time + 0.05);
  noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
  
  noise.start(time);
  noise.stop(time + 0.2);
};

export const playTom = (audioContext: AudioContext, time: number) => {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.frequency.setValueAtTime(250, time);
  osc.frequency.exponentialRampToValueAtTime(100, time + 0.4);

  gain.gain.setValueAtTime(0.8, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

  osc.start(time);
  osc.stop(time + 0.4);
};