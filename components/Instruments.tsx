import React, { useState } from 'react';
import { DRUM_INSTRUMENTS, MELODIC_INSTRUMENTS } from '../constants';
import type { Instrument } from '../models';

const DrumInstrumentControls: React.FC<{
  onPreview: (instrumentId: string) => void;
  getVocalSoundsForInstrument: (instrumentId: string) => string[];
  onVocalSoundChange: (instrumentId: string, newSounds: string) => void;
}> = ({ onPreview, getVocalSoundsForInstrument, onVocalSoundChange }) => {
    return (
        <div className="bg-indigo-950 rounded-xl shadow-lg p-4 w-full max-w-sm flex flex-col border-t-4 border-gray-500 transition-all duration-300 hover:shadow-indigo-600/30 hover:shadow-2xl hover:-translate-y-1">
            <h3 className="text-2xl font-bold text-white mb-3">Drum Kit</h3>
            <div className="space-y-2">
                {DRUM_INSTRUMENTS.map(inst => {
                    const buttonHoverClass = `hover:bg-${inst.accentColor}-500`;
                    return (
                        <div key={inst.id} className="flex items-center gap-2">
                            <button
                                onClick={() => onPreview(inst.id)}
                                className={`w-24 h-10 flex-shrink-0 text-sm font-bold bg-indigo-900 rounded transition-colors ${buttonHoverClass}`}
                            >
                                {inst.name}
                            </button>
                            <input
                                type="text"
                                aria-label={`${inst.name} vocal triggers`}
                                value={getVocalSoundsForInstrument(inst.id).join(', ')}
                                onChange={(e) => onVocalSoundChange(inst.id, e.target.value)}
                                placeholder="e.g. boom, b"
                                className="w-full bg-indigo-800 border border-indigo-600 rounded-md py-1.5 px-3 text-white focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


interface MelodicInstrumentControlsProps {
  instrument: Instrument;
  onPreview: (note: string) => void;
  syllableMap: Record<string, string>;
  onSyllableChange: (note: string, syllable: string) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
}

const MelodicInstrumentControls: React.FC<MelodicInstrumentControlsProps> = ({ instrument, onPreview, syllableMap, onSyllableChange, scale, onScaleChange }) => {
    const accentClass = `border-${instrument.accentColor}-500`;
    const buttonHoverClass = `hover:bg-${instrument.accentColor}-500`;

    return (
        <div className={`bg-indigo-950 rounded-xl shadow-lg p-4 w-full max-w-sm flex flex-col border-t-4 transition-all duration-300 hover:shadow-indigo-600/30 hover:shadow-2xl hover:-translate-y-1 ${accentClass}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-2xl font-bold text-white">{instrument.name}</h3>
              <div className="flex items-center gap-2">
                <label htmlFor={`${instrument.id}-scale`} className="text-sm font-medium text-indigo-300">Octave</label>
                <input
                    type="number"
                    id={`${instrument.id}-scale`}
                    min="1"
                    max="8"
                    value={scale}
                    onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) onScaleChange(Math.max(1, Math.min(8, val)));
                    }}
                    className="w-16 bg-indigo-800 border border-indigo-600 rounded-md py-1 px-2 text-white focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
                {(instrument.notes as string[])
                  .filter(note => parseInt(note.replace(/[^0-9]/g, '')) === scale)
                  .map(note => (
                    <div key={note} className="flex items-center gap-2">
                         <button onClick={() => onPreview(note)} className={`w-14 h-10 flex-shrink-0 text-sm font-bold rounded transition-colors ${note.includes('#') ? 'bg-gray-800 hover:bg-gray-700' : `bg-indigo-900 ${buttonHoverClass}`}`}>
                            {note}
                        </button>
                        <input
                            type="text"
                            value={syllableMap[note] || ''}
                            onChange={(e) => onSyllableChange(note, e.target.value)}
                            placeholder="Syllable"
                            className="w-full bg-indigo-800 border border-indigo-600 rounded-md py-1.5 px-3 text-white focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};


const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left">
                <h2 className="text-2xl font-semibold mb-4 text-indigo-400 whitespace-nowrap flex justify-between items-center">
                    {title}
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </h2>
            </button>
            {isOpen && <div className="flex flex-col gap-4">{children}</div>}
        </div>
    );
};


interface InstrumentsProps {
  isCollapsed: boolean;
  onDrumPreview: (instrumentId: string) => void;
  onMelodicPreview: (instrumentId: 'piano' | 'guitar', note: string) => void;
  getVocalSoundsForInstrument: (instrumentId: string) => string[];
  onVocalSoundChange: (instrumentId: string, newSounds: string) => void;
  melodicSyllableMap: Record<string, Record<string, string>>;
  onMelodicSyllableChange: (instrumentId: 'piano' | 'guitar', note: string, syllable: string) => void;
  pianoScale: number;
  onPianoScaleChange: (scale: number) => void;
  guitarScale: number;
  onGuitarScaleChange: (scale: number) => void;
}

export const Instruments: React.FC<InstrumentsProps> = ({
  isCollapsed, onDrumPreview, onMelodicPreview, getVocalSoundsForInstrument,
  onVocalSoundChange, melodicSyllableMap, onMelodicSyllableChange,
  pianoScale, onPianoScaleChange, guitarScale, onGuitarScaleChange
}) => {
  return (
    <aside className={`flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 overflow-hidden' : 'w-full lg:w-[338px]'}`}>
      <div className={`transition-opacity duration-300 h-full overflow-y-auto custom-scrollbar pr-2 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
        <div className="space-y-6">
            <CollapsibleSection title="Drums">
                <DrumInstrumentControls
                    onPreview={onDrumPreview}
                    getVocalSoundsForInstrument={getVocalSoundsForInstrument}
                    onVocalSoundChange={onVocalSoundChange}
                />
            </CollapsibleSection>

            {MELODIC_INSTRUMENTS.map(inst => {
                 const isPiano = inst.id === 'piano';
                 return (
                    <CollapsibleSection key={inst.id} title={inst.name}>
                        <MelodicInstrumentControls
                            instrument={inst}
                            onPreview={(note) => onMelodicPreview(inst.id as 'piano' | 'guitar', note)}
                            syllableMap={melodicSyllableMap[inst.id]}
                            onSyllableChange={(note, syllable) => onMelodicSyllableChange(inst.id as 'piano' | 'guitar', note, syllable)}
                            scale={isPiano ? pianoScale : guitarScale}
                            onScaleChange={isPiano ? onPianoScaleChange : onGuitarScaleChange}
                        />
                    </CollapsibleSection>
                 )
            })}
        </div>
      </div>
    </aside>
  );
};