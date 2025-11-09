export type AccentColor = 'red' | 'blue' | 'yellow' | 'green' | 'purple';

export type InstrumentType = 'drum' | 'piano' | 'guitar';

export interface Instrument {
  // Fix: Changed id from InstrumentType to string to accommodate specific drum instrument ids like 'kick', 'snare', etc.
  id: string;
  name: string;
  type: 'drum' | 'melodic';
  accentColor: AccentColor;
  // For melodic instruments
  // Fix: Changed notes from Record<string, string> to string[] to match the data in constants.ts (e.g., PIANO_NOTES).
  notes?: string[];
}

export interface Hit {
  id:string;
  instrumentId: InstrumentType; 
  time: number; // A float from 0 to totalSteps
  // For melodic instruments
  note?: string; // e.g., 'C4'
  duration?: number; // in steps
  // For drum instruments
  drumInstrumentId?: string; // e.g., 'kick', 'snare'
}

export interface Track {
  id: string;
  hits: Hit[];
  pianoOctave: number;
  guitarOctave: number;
}

export interface DraggingState {
  startX: number;
  startY: number;
  trackWidth: number;
  isNoteDrag?: boolean; // To distinguish between drum and note dragging
  isResize?: boolean;
  noteRange?: string[]; // For melodic
  dragGroup: { 
    hitId: string; 
    startTime: number; 
    startDuration?: number; // for melodic resize
    startNote?: string; // for melodic move
    startDrumInstrumentId?: string; // for drums
  }[];
}

export interface TimeSignatureData {
  stepsPerBar: number;
  beatsPerBar: number;
  stepsPerBeat: number;
}