import React, { forwardRef } from 'react';
// Fix: Import MELODIC_INSTRUMENTS.
import { DRUM_INSTRUMENTS, MELODIC_INSTRUMENTS } from '../constants';
import type { Hit, TimeSignatureData, AccentColor, Track, InstrumentType, Instrument } from '../models';

const accentColorBgMap: Record<AccentColor, string> = {
  red: 'bg-red-500', blue: 'bg-blue-500', yellow: 'bg-yellow-400',
  green: 'bg-green-500', purple: 'bg-purple-500',
};

const DrumSequencer: React.FC<{
    track: Track;
    setInstrumentTrackRef: (instrumentId: string, el: HTMLDivElement | null) => void;
    totalSteps: number;
    timeSignatureData: TimeSignatureData;
    onHitMouseDown: (e: React.MouseEvent, hit: Hit) => void;
    onDeleteHit: (hitId: string) => void;
    selectedHitIds: Set<string>;
}> = ({ track, setInstrumentTrackRef, totalSteps, timeSignatureData, onHitMouseDown, onDeleteHit, selectedHitIds }) => (
    <>
        {DRUM_INSTRUMENTS.map(inst => (
            <div key={inst.id} ref={(el) => setInstrumentTrackRef(`drum_${inst.id}`, el)} className="track relative bg-indigo-950 rounded-md w-full h-16 sm:h-20 cursor-pointer">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    {Array.from({ length: totalSteps }).map((_, j) => {
                        if (j === 0) return null;
                        const { stepsPerBar, stepsPerBeat } = timeSignatureData;
                        const isBarStart = j % stepsPerBar === 0;
                        const isBeatStart = j % stepsPerBeat === 0;
                        let borderClass = isBarStart ? 'border-l-2 border-indigo-300/80' : isBeatStart ? 'border-l border-indigo-500/60' : 'border-l border-indigo-700/40';
                        return <div key={j} className={`absolute top-0 h-full ${borderClass}`} style={{ left: `${(j / totalSteps) * 100}%` }} />;
                    })}
                </div>
                {track.hits.filter(h => h.instrumentId === 'drum' && h.drumInstrumentId === inst.id).map(hit => (
                    <div key={hit.id}
                        onMouseDown={(e) => onHitMouseDown(e, hit)}
                        onDoubleClick={(e) => { e.stopPropagation(); onDeleteHit(hit.id); }}
                        className={`absolute top-1/2 -translate-y-1/2 h-12 sm:h-16 w-3 rounded-sm cursor-grab active:cursor-grabbing transition-shadow ${accentColorBgMap[inst.accentColor]} ${selectedHitIds.has(hit.id) ? 'ring-2 ring-white shadow-lg' : ''}`}
                        style={{ left: `calc(${(hit.time / totalSteps) * 100}% - 6px)` }}
                        title="Double-click to delete. Shift+click to multi-select."
                    />
                ))}
            </div>
        ))}
    </>
);

const PianoRoll: React.FC<{
    track: Track;
    instrument: Instrument;
    activeNotes: string[];
    setInstrumentTrackRef: (note: string, el: HTMLDivElement | null) => void;
    totalSteps: number;
    timeSignatureData: TimeSignatureData;
    onHitMouseDown: (e: React.MouseEvent, hit: Hit) => void;
    onDeleteHit: (hitId: string) => void;
    selectedHitIds: Set<string>;
}> = ({ track, instrument, activeNotes, setInstrumentTrackRef, totalSteps, timeSignatureData, onHitMouseDown, onDeleteHit, selectedHitIds }) => {
    return (
        <>
            {activeNotes.map((note: string) => (
                <div key={note} ref={(el) => setInstrumentTrackRef(`${instrument.id}_${note}`, el)} className={`track relative rounded-md w-full h-8 cursor-pointer ${note.includes('#') ? 'bg-gray-800' : 'bg-indigo-950'}`}>
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                         {Array.from({ length: totalSteps }).map((_, j) => {
                            if (j === 0) return null;
                            const { stepsPerBar, stepsPerBeat } = timeSignatureData;
                            const isBarStart = j % stepsPerBar === 0;
                            const isBeatStart = j % stepsPerBeat === 0;
                            let borderClass = isBarStart ? `border-l-2 ${note.includes('#') ? 'border-gray-500/80' : 'border-indigo-300/80'}` : isBeatStart ? `border-l ${note.includes('#') ? 'border-gray-600/60' : 'border-indigo-500/60'}` : `border-l ${note.includes('#') ? 'border-gray-700/40' : 'border-indigo-700/40'}`;
                            return <div key={j} className={`absolute top-0 h-full ${borderClass}`} style={{ left: `${(j / totalSteps) * 100}%` }} />;
                        })}
                    </div>
                    {track.hits.filter(h => h.instrumentId === instrument.id && h.note === note).map(hit => (
                        <div key={hit.id}
                            onMouseDown={(e) => onHitMouseDown(e, hit)}
                            onDoubleClick={(e) => { e.stopPropagation(); onDeleteHit(hit.id); }}
                            className={`absolute top-0 h-full rounded-sm cursor-grab active:cursor-grabbing transition-shadow ${accentColorBgMap[instrument.accentColor]} ${selectedHitIds.has(hit.id) ? 'ring-2 ring-white shadow-lg' : ''}`}
                            style={{ left: `${(hit.time / totalSteps) * 100}%`, width: `${((hit.duration || 1) / totalSteps) * 100}%` }}
                            title={`${hit.note} (Double-click to delete)`}
                        >
                            <div onMouseDown={(e) => onHitMouseDown(e, {...hit, isResize: true} as any)} className="absolute right-0 top-0 h-full w-2 cursor-ew-resize" />
                        </div>
                    ))}
                </div>
            ))}
        </>
    )
};


interface MidiEditorProps {
  track: Track;
  trackNumber: number;
  isActive: boolean;
  isPlaying: boolean;
  instrumentType: InstrumentType;
  activeNotes: string[];
  selectedHitIds: Set<string>;
  currentStep: number;
  timelineWidth: number;
  renderedMarquee: React.ReactNode;
  timeSignatureData: TimeSignatureData;
  totalSteps: number;
  octave: number;
  onOctaveChange: (newOctave: number) => void;
  onSetActive: () => void;
  onHitMouseDown: (e: React.MouseEvent, hit: Hit) => void;
  onDeleteHit: (hitId: string) => void;
  onPlayToggle: () => void;
  onClear: () => void;
  onDownloadMidi: () => void;
  onOpenSettings: () => void;
  onTimelineMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDeleteTrack: () => void;
  timelineContainerRef: (el: HTMLDivElement | null) => void;
  setInstrumentTrackRef: (id: string, el: HTMLDivElement | null) => void;
  trackBodyRef: (el: HTMLDivElement | null) => void;
  downloadButtonRef?: React.Ref<HTMLButtonElement>;
}


export const MidiEditor = forwardRef<HTMLElement, MidiEditorProps>(({
  track, trackNumber, isActive, isPlaying, instrumentType, activeNotes, selectedHitIds, currentStep,
  timelineWidth, renderedMarquee, timeSignatureData, totalSteps, octave, onOctaveChange,
  onSetActive, onHitMouseDown, onDeleteHit, onPlayToggle, onClear,
  onDownloadMidi, onOpenSettings, onTimelineMouseDown, onDeleteTrack,
  timelineContainerRef, setInstrumentTrackRef, trackBodyRef, downloadButtonRef
}, ref) => {
  
  const labels = instrumentType === 'drum' ? DRUM_INSTRUMENTS : activeNotes;

  return (
    <section 
      onClick={onSetActive} 
      ref={ref}
      className={`bg-black/30 p-4 rounded-xl shadow-lg w-full flex flex-col min-h-0 border-2 transition-colors ${isActive ? 'border-indigo-600' : 'border-gray-800'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold text-indigo-400">Track {trackNumber}</h2>
          {(instrumentType === 'piano' || instrumentType === 'guitar') && (
              <div className="flex items-center gap-2">
                  <label htmlFor={`track-${track.id}-octave`} className="text-sm font-medium text-indigo-300">Octave</label>
                  <input
                      type="number"
                      id={`track-${track.id}-octave`}
                      min="1"
                      max="8"
                      value={octave}
                      onClick={(e) => e.stopPropagation()} // Prevent track activation while clicking
                      onChange={(e) => {
                          e.stopPropagation();
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) onOctaveChange(Math.max(1, Math.min(8, val)));
                      }}
                      className="w-16 bg-gray-700 border border-gray-600 rounded-md py-1 px-2 text-white focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
              </div>
          )}
        </div>
         <div className="flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); onPlayToggle(); }} className={`w-24 text-white font-semibold py-2 px-4 rounded-md transition ${isPlaying ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}>
              {isPlaying ? 'Stop' : 'Play'}
            </button>
            <button onClick={e => { e.stopPropagation(); onClear(); }} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md transition">Clear</button>
            <button ref={downloadButtonRef} onClick={e => { e.stopPropagation(); onDownloadMidi(); }} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-md transition">Download MIDI</button>
            <button onClick={e => { e.stopPropagation(); onOpenSettings(); }} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-md transition" title="Open Instrument Settings">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379-1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
            <button onClick={e => { e.stopPropagation(); onDeleteTrack(); }} className="bg-red-800 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition">Delete Track</button>
         </div>
      </div>

      <div className="flex-grow flex min-h-0 gap-2">
          <div className="flex-shrink-0 flex flex-col gap-1 pr-2">
              {labels?.map(item => <div key={typeof item === 'string' ? item : item.id} className={`w-16 flex-shrink-0 flex items-center justify-center text-indigo-300 text-sm font-semibold tracking-wider uppercase ${instrumentType === 'drum' ? 'h-16 sm:h-20' : 'h-8'}`} title={typeof item === 'string' ? item : item.name}>{typeof item === 'string' ? item : (item as Instrument).name}</div>)}
          </div>

          <div 
            className="flex-grow overflow-x-auto relative custom-scrollbar" 
            onMouseDown={onTimelineMouseDown} 
            style={{ scrollbarColor: '#4338ca #111827', scrollbarWidth: 'thin' }}
          >
              {renderedMarquee}
              <div ref={timelineContainerRef} className="relative h-full flex-shrink-0" style={{ width: `${timelineWidth}px` }}>
                  <div className="absolute top-0 left-0 w-full h-full flex flex-col gap-1">
                     {instrumentType === 'drum' ? (
                        <DrumSequencer track={track} {...{totalSteps, timeSignatureData, onHitMouseDown, onDeleteHit, selectedHitIds, setInstrumentTrackRef}}/>
                     ) : (
                        <PianoRoll track={track} instrument={MELODIC_INSTRUMENTS.find(i => i.id === instrumentType)!} activeNotes={activeNotes} {...{totalSteps, timeSignatureData, onHitMouseDown, onDeleteHit, selectedHitIds, setInstrumentTrackRef}}/>
                     )}
                  </div>
                  {currentStep >= 0 && <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none" style={{ left: `${(currentStep / totalSteps) * 100}%` }}></div>}
              </div>
          </div>
      </div>
    </section>
  );
});