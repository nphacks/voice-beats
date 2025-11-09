import type { Instrument } from './models';

export const DRUM_INSTRUMENTS: Instrument[] = [
  { id: 'kick', name: 'Kick', type: 'drum', accentColor: 'red' },
  { id: 'snare', name: 'Snare', type: 'drum', accentColor: 'blue' },
  { id: 'hi-hat', name: 'Hi-hat', type: 'drum', accentColor: 'yellow' },
  { id: 'clap', name: 'Clap', type: 'drum', accentColor: 'green' },
  { id: 'tom', name: 'Tom', type: 'drum', accentColor: 'purple' },
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const generateNoteRange = (startNote: string, endNote: string): string[] => {
    const notes: string[] = [];
    const startOctave = parseInt(startNote.slice(-1));
    const startNoteName = startNote.slice(0, -1);
    const endOctave = parseInt(endNote.slice(-1));
    const endNoteName = endNote.slice(0, -1);
    
    let currentOctave = startOctave;
    let currentNoteIndex = NOTE_NAMES.indexOf(startNoteName);

    while (currentOctave < endOctave || (currentOctave === endOctave && currentNoteIndex <= NOTE_NAMES.indexOf(endNoteName))) {
        notes.push(NOTE_NAMES[currentNoteIndex] + currentOctave);
        currentNoteIndex++;
        if (currentNoteIndex >= NOTE_NAMES.length) {
            currentNoteIndex = 0;
            currentOctave++;
        }
    }
    return notes;
};

export const PIANO_NOTE_RANGE = generateNoteRange('C1', 'C8');
export const GUITAR_NOTE_RANGE = generateNoteRange('E2', 'E6');


export const MELODIC_INSTRUMENTS: Instrument[] = [
    {
        id: 'piano',
        name: 'Piano',
        type: 'melodic',
        accentColor: 'blue',
        notes: PIANO_NOTE_RANGE,
    },
    {
        id: 'guitar',
        name: 'Guitar',
        type: 'melodic',
        accentColor: 'green',
        notes: GUITAR_NOTE_RANGE,
    }
];

export const ALL_INSTRUMENTS: Record<string, Instrument> = 
  [...DRUM_INSTRUMENTS, ...MELODIC_INSTRUMENTS].reduce((acc, inst) => {
    acc[inst.id] = inst;
    return acc;
  }, {} as Record<string, Instrument>);