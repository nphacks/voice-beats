import type { Hit, Instrument, TimeSignatureData, Track, InstrumentType } from './models';

const drumIdToMidiNote: Record<string, number> = {
  kick: 36, snare: 38, 'hi-hat': 42, clap: 39, tom: 41,
};

const generateNoteToMidiMap = (): Record<string, number> => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const map: Record<string, number> = {};
    for (let octave = -1; octave < 10; octave++) {
        for (let i = 0; i < 12; i++) {
            const noteName = noteNames[i] + octave;
            const midiNumber = (octave + 1) * 12 + i;
            if (midiNumber <= 127) {
                map[noteName] = midiNumber;
            }
        }
    }
    return map;
};
const noteNameToMidi = generateNoteToMidiMap();


const PPQN = 480; // Ticks per quarter note

function writeUint32(arr: number[], value: number) { arr.push((value >> 24) & 0xFF, (value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF); }
function writeUint16(arr: number[], value: number) { arr.push((value >> 8) & 0xFF, value & 0xFF); }
function writeString(arr: number[], str: string) { for (let i = 0; i < str.length; i++) arr.push(str.charCodeAt(i)); }
function writeVLQ(arr: number[], value: number) {
  let buffer = value & 0x7F;
  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= ((value & 0x7F) | 0x80);
  }
  while (true) {
    arr.push(buffer & 0xFF);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
}

const createMidiTrack = (events: { tick: number; message: number[] }[]): number[] => {
    const trackBytes: number[] = [];
    events.sort((a, b) => a.tick - b.tick);
    let lastTick = 0;
    for (const event of events) {
        writeVLQ(trackBytes, event.tick - lastTick);
        trackBytes.push(...event.message);
        lastTick = event.tick;
    }
    writeVLQ(trackBytes, 0);
    trackBytes.push(0xFF, 0x2F, 0x00); // End of Track
    return trackBytes;
};

export const generateMidi = (
    tracks: Track[], bpm: number, timeSignature: string,
    timeSignatureData: TimeSignatureData, barsPerTrack: number
  ): Uint8Array => {

  const bytes: number[] = [];
  const ticksPerStep = (PPQN * 4) / timeSignatureData.stepsPerBar;
  
  const allHits = tracks.flatMap(track => track.hits);
  const drumHits = allHits.filter(h => h.instrumentId === 'drum');
  const pianoHits = allHits.filter(h => h.instrumentId === 'piano');
  const guitarHits = allHits.filter(h => h.instrumentId === 'guitar');

  const midiTracks: number[][] = [];
  
  // Track 0: Tempo/Meta Track
  const tempoTrackEvents = [];
  const [num, den] = timeSignature.split('/').map(Number);
  tempoTrackEvents.push({ tick: 0, message: [0xFF, 0x58, 0x04, num, Math.log2(den), 24, 8] });
  const microPerQuarter = Math.round(60_000_000 / bpm);
  tempoTrackEvents.push({ tick: 0, message: [0xFF, 0x51, 0x03, (microPerQuarter >> 16) & 0xFF, (microPerQuarter >> 8) & 0xFF, microPerQuarter & 0xFF] });
  midiTracks.push(createMidiTrack(tempoTrackEvents));

  // Track 1: Drums (Channel 10)
  if (drumHits.length > 0) {
      const drumEvents: { tick: number; message: number[] }[] = [];
      for (const hit of drumHits) {
          if (!hit.drumInstrumentId) continue;
          const midiNote = drumIdToMidiNote[hit.drumInstrumentId];
          if (midiNote === undefined) continue;
          const tick = Math.round(hit.time * ticksPerStep);
          const durationTicks = Math.round(ticksPerStep / 2);
          drumEvents.push({ tick, message: [0x99, midiNote, 100] }); // Note On, Channel 10
          drumEvents.push({ tick: tick + durationTicks, message: [0x89, midiNote, 0] }); // Note Off
      }
      midiTracks.push(createMidiTrack(drumEvents));
  }
  
  // Track 2: Piano (Channel 1)
  if (pianoHits.length > 0) {
    const pianoEvents: { tick: number; message: number[] }[] = [];
    for (const hit of pianoHits) {
        if (!hit.note) continue;
        const midiNote = noteNameToMidi[hit.note];
        if (midiNote === undefined) continue;
        const tick = Math.round(hit.time * ticksPerStep);
        const durationTicks = Math.round((hit.duration || 1) * ticksPerStep);
        pianoEvents.push({ tick, message: [0x90, midiNote, 100] }); // Note On, Channel 1
        pianoEvents.push({ tick: tick + durationTicks, message: [0x80, midiNote, 0] }); // Note Off
    }
    midiTracks.push(createMidiTrack(pianoEvents));
  }

  // Track 3: Guitar (Channel 2)
  if (guitarHits.length > 0) {
    const guitarEvents: { tick: number; message: number[] }[] = [];
    for (const hit of guitarHits) {
        if (!hit.note) continue;
        const midiNote = noteNameToMidi[hit.note];
        if (midiNote === undefined) continue;
        const tick = Math.round(hit.time * ticksPerStep);
        const durationTicks = Math.round((hit.duration || 1) * ticksPerStep);
        guitarEvents.push({ tick, message: [0x91, midiNote, 100] }); // Note On, Channel 2
        guitarEvents.push({ tick: tick + durationTicks, message: [0x81, midiNote, 0] }); // Note Off
    }
    midiTracks.push(createMidiTrack(guitarEvents));
  }
  
  // Write MThd Header
  writeString(bytes, 'MThd');
  writeUint32(bytes, 6);
  writeUint16(bytes, midiTracks.length > 1 ? 1 : 0);
  writeUint16(bytes, midiTracks.length);
  writeUint16(bytes, PPQN);

  // Write all tracks
  for (const trackData of midiTracks) {
    writeString(bytes, 'MTrk');
    writeUint32(bytes, trackData.length);
    bytes.push(...trackData);
  }

  return new Uint8Array(bytes);
};