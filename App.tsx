
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Instruments } from './components/Instruments';
import { VoiceMapping } from './components/VoiceMapping';
import { MidiEditor } from './components/MidiEditor';
import { GlobalControls } from './components/GlobalControls';
import { Tutorial } from './components/Tutorial';
import { DRUM_INSTRUMENTS, MELODIC_INSTRUMENTS, PIANO_NOTE_RANGE, GUITAR_NOTE_RANGE } from './constants';
import type { Instrument, Hit, DraggingState, Track, InstrumentType } from './models';
import { playKick, playSnare, playHiHat, playClap, playTom, playMelodicNote, noteToFrequency } from './synth';
import { generateMidi } from './midi';


const INITIAL_BPM = 120;
const INITIAL_TIME_SIGNATURE = '4/4';
const INITIAL_BARS = 2;
const BAR_WIDTH_PX = 640; 
const MAX_TRACKS = 10;
const LOCAL_STORAGE_KEY = 'voicebeats_tracks';
const TUTORIAL_STORAGE_KEY = 'voicebeats_tutorial_seen';

const drumSynthMap: Record<string, (ctx: AudioContext, time: number) => void> = {
  kick: playKick, snare: playSnare, 'hi-hat': playHiHat, clap: playClap, tom: playTom,
};

const INITIAL_VOCAL_SOUND_MAP: Record<string, string> = {
  'boom': 'kick', 'b': 'kick', 'ka': 'snare', 'k': 'snare', 'tss': 'hi-hat',
  'ts': 'hi-hat', 't': 'hi-hat', 'clap': 'clap', 'klap': 'clap', 'dum': 'tom', 'dom': 'tom',
};

const INITIAL_MELODIC_SYLLABLE_MAP: Record<string, Record<string, string>> = {
  piano: { 'C4': 'do', 'D4': 're', 'E4': 'mi', 'F4': 'fa', 'G4': 'sol', 'A4': 'la', 'B4': 'ti' },
  guitar: { 'E3': 'do', 'A3': 're', 'D4': 'mi', 'G4': 'fa', 'B4': 'sol', 'E5': 'la' },
};


const InstrumentTypeSelector: React.FC<{
    activeType: InstrumentType,
    onTypeChange: (type: InstrumentType) => void
}> = ({ activeType, onTypeChange }) => (
    <div className="flex items-center gap-2 mb-4 bg-gray-900 p-2 rounded-lg">
        {(['drum', 'piano', 'guitar'] as InstrumentType[]).map(type => (
            <button 
                key={type} 
                onClick={() => onTypeChange(type)}
                className={`px-4 py-2 rounded-md font-semibold transition capitalize w-full ${activeType === type ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-indigo-300 hover:bg-indigo-900'}`}
            >
                {type}
            </button>
        ))}
    </div>
);

const loadInitialTracks = (): Track[] => {
  try {
    const savedTracks = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedTracks) {
      const parsedTracks = JSON.parse(savedTracks);
      if (Array.isArray(parsedTracks) && parsedTracks.length > 0) {
        return parsedTracks.slice(0, MAX_TRACKS);
      }
    }
  } catch (error) {
    console.error("Failed to load tracks from localStorage", error);
  }
  return [{ id: crypto.randomUUID(), hits: [], pianoOctave: 4, guitarOctave: 3 }];
};


const App: React.FC = () => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [timeSignature, setTimeSignature] = useState(INITIAL_TIME_SIGNATURE);
  const [bars, setBars] = useState(INITIAL_BARS);
  
  const [tracks, setTracks] = useState<Track[]>(loadInitialTracks);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(tracks.length > 0 ? tracks[0].id : null);
  const [activeInstrumentType, setActiveInstrumentType] = useState<InstrumentType>('drum');

  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [bpm, setBpm] = useState(INITIAL_BPM);
  const [metronomeOn, setMetronomeOn] = useState(false);

  const [selectedHitIds, setSelectedHitIds] = useState<Set<string>>(new Set());
  const [draggingHit, setDraggingHit] = useState<DraggingState | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{trackId: string; startX: number; startY: number; endX: number; endY: number} | null>(null);
  const [initialSelectionOnMarquee, setInitialSelectionOnMarquee] = useState<Set<string>>(new Set());
  
  const [vocalSoundMap, setVocalSoundMap] = useState(INITIAL_VOCAL_SOUND_MAP);
  const [melodicSyllableMap, setMelodicSyllableMap] = useState(INITIAL_MELODIC_SYLLABLE_MAP);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const schedulerIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playbackCycleStartTimeRef = useRef<number>(0);
  const lastScheduledTimeRef = useRef<number>(0);

  const timelineContainerRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const trackBodyRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const instrumentTrackRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Refs for tutorial targets
  const voiceMappingRef = useRef<HTMLDivElement>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);
  const firstTrackRef = useRef<HTMLElement>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);

  const metronomeOnRef = useRef(metronomeOn);
  useEffect(() => { metronomeOnRef.current = metronomeOn; }, [metronomeOn]);
  const tracksRef = useRef(tracks);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  const playingTrackIdRef = useRef(playingTrackId);
  useEffect(() => { playingTrackIdRef.current = playingTrackId; }, [playingTrackId]);
  const isPlayingAllRef = useRef(isPlayingAll);
  useEffect(() => { isPlayingAllRef.current = isPlayingAll; }, [isPlayingAll]);

  useEffect(() => {
    try {
      const tutorialSeen = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!tutorialSeen) {
        setIsTutorialActive(true);
      }
    } catch (error) {
      console.error("Could not read from localStorage", error);
    }
  }, []);

  const handleTutorialClose = () => {
    setIsTutorialActive(false);
    setTutorialStep(0);
    try {
        localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } catch (error) {
        console.error("Could not write to localStorage", error);
    }
  };

  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tracks));
      } catch (error) {
        console.error("Failed to save tracks to localStorage", error);
      }
    }, 2000); // Save 2 seconds after the last change

    return () => {
      clearTimeout(saveTimeout);
    };
  }, [tracks]);

  const timeSignatureData = useMemo(() => {
    switch (timeSignature) {
        case '3/4': return { stepsPerBar: 12, beatsPerBar: 3, stepsPerBeat: 4 };
        case '6/8': return { stepsPerBar: 12, beatsPerBar: 6, stepsPerBeat: 2 };
        case '4/4': default: return { stepsPerBar: 16, beatsPerBar: 4, stepsPerBeat: 4 };
    }
  }, [timeSignature]);

  const totalStepsPerTrack = useMemo(() => timeSignatureData.stepsPerBar * bars, [timeSignatureData, bars]);
  const totalDurationPerTrackSecs = useMemo(() => (totalStepsPerTrack / timeSignatureData.stepsPerBeat) * (60 / bpm), [totalStepsPerTrack, timeSignatureData, bpm]);
  
  const activeTrack = useMemo(() => tracks.find(t => t.id === activeTrackId), [tracks, activeTrackId]);

  const activeNotes = useMemo(() => {
    if (activeInstrumentType === 'drum' || !activeTrack) return [];
    
    const scale = activeInstrumentType === 'piano' ? activeTrack.pianoOctave : activeTrack.guitarOctave;
    const instrument = MELODIC_INSTRUMENTS.find(i => i.id === activeInstrumentType);
    if (!instrument || !instrument.notes) return [];
    
    return instrument.notes.filter(note => {
        const octaveStr = note.replace(/[^0-9]/g, '');
        const octave = parseInt(octaveStr, 10);
        return octave === scale || octave === scale - 1; // Show two octaves
    }).reverse(); 
  }, [activeInstrumentType, activeTrack]);


  useEffect(() => { document.addEventListener('click', () => setAudioContext(p => p ?? new (window.AudioContext || (window as any).webkitAudioContext)()), { once: true }); }, []);
  
  const stopPlayback = useCallback(() => {
    setIsPlayingAll(false); setPlayingTrackId(null);
    if (schedulerIntervalRef.current) clearInterval(schedulerIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    schedulerIntervalRef.current = null; animationFrameRef.current = null; setCurrentStep(0);
  }, []);

  useEffect(() => {
    stopPlayback();
    setTracks(prev => prev.map(track => ({ ...track, hits: track.hits.filter(h => h.time < totalStepsPerTrack)})));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalStepsPerTrack]);

  const playMetronomeSound = useCallback((time: number, isDownBeat: boolean) => {
    if (!audioContext) return;
    const osc = audioContext.createOscillator(); const gain = audioContext.createGain();
    osc.connect(gain); gain.connect(audioContext.destination);
    osc.frequency.setValueAtTime(isDownBeat ? 880 : 440, time);
    gain.gain.setValueAtTime(0.2, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.start(time); osc.stop(time + 0.05);
  }, [audioContext]);

  const scheduleNotes = useCallback(() => {
    if (!audioContext) return;
    const scheduleUntil = audioContext.currentTime + 0.1, cycleStartTime = playbackCycleStartTimeRef.current, totalDuration = totalDurationPerTrackSecs;
    
    while(lastScheduledTimeRef.current < scheduleUntil) {
      const currentCycleProgressSecs = lastScheduledTimeRef.current - cycleStartTime, timeInTrackSecs = currentCycleProgressSecs % totalDuration;
      const tracksToPlay = isPlayingAllRef.current ? tracksRef.current : tracksRef.current.filter(t => t.id === playingTrackIdRef.current);

      for (const track of tracksToPlay) {
          for (const hit of track.hits) {
            const hitTimeInSec = (hit.time / totalStepsPerTrack) * totalDuration;
            if (hitTimeInSec >= timeInTrackSecs && hitTimeInSec < timeInTrackSecs + 0.02) {
                if (hit.instrumentId === 'drum' && hit.drumInstrumentId) {
                    drumSynthMap[hit.drumInstrumentId]?.(audioContext, lastScheduledTimeRef.current);
                } else if ((hit.instrumentId === 'piano' || hit.instrumentId === 'guitar') && hit.note) {
                    const freq = noteToFrequency(hit.note);
                    const duration = ((hit.duration || 1) / timeSignatureData.stepsPerBeat) * (60/bpm);
                    playMelodicNote(audioContext, lastScheduledTimeRef.current, freq, duration, hit.instrumentId);
                }
            }
          }
      }

      if (metronomeOnRef.current) {
        const { stepsPerBeat, beatsPerBar } = timeSignatureData; const beatsInTrack = (totalStepsPerTrack / stepsPerBeat);
        for(let beat = 0; beat < beatsInTrack; beat++) {
            const beatTimeInSec = (beat * stepsPerBeat / totalStepsPerTrack) * totalDuration;
            if (beatTimeInSec >= timeInTrackSecs && beatTimeInSec < timeInTrackSecs + 0.02) playMetronomeSound(lastScheduledTimeRef.current, beat % beatsPerBar === 0);
        }
      }
      lastScheduledTimeRef.current += 0.02;
    }
  }, [audioContext, totalDurationPerTrackSecs, totalStepsPerTrack, timeSignatureData, playMetronomeSound, bpm]);

  const animationLoop = useCallback(() => {
    if (!isPlayingAllRef.current && !playingTrackIdRef.current || !audioContext) return;
    const elapsed = audioContext.currentTime - playbackCycleStartTimeRef.current;
    setCurrentStep((elapsed % totalDurationPerTrackSecs / totalDurationPerTrackSecs) * totalStepsPerTrack);
    animationFrameRef.current = requestAnimationFrame(animationLoop);
  }, [audioContext, totalDurationPerTrackSecs, totalStepsPerTrack]);

  const startPlayback = useCallback(async (mode: 'all' | 'single', trackId?: string) => {
    if (!audioContext) return; if (audioContext.state === 'suspended') await audioContext.resume();
    stopPlayback();
    if (mode === 'all') setIsPlayingAll(true); else if (trackId) setPlayingTrackId(trackId);
    playbackCycleStartTimeRef.current = audioContext.currentTime; lastScheduledTimeRef.current = audioContext.currentTime; setCurrentStep(0);
    schedulerIntervalRef.current = window.setInterval(scheduleNotes, 20);
    animationFrameRef.current = requestAnimationFrame(animationLoop);
  }, [audioContext, scheduleNotes, animationLoop, stopPlayback]);

  useEffect(() => {
    if (isPlayingAll || playingTrackId) startPlayback(isPlayingAll ? 'all' : 'single', playingTrackId ?? undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm]); 

  const handleDrumPreview = (instrumentId: string) => audioContext && drumSynthMap[instrumentId]?.(audioContext, audioContext.currentTime);
  const handleMelodicPreview = (instrumentId: 'piano' | 'guitar', note: string) => {
    if (audioContext) playMelodicNote(audioContext, audioContext.currentTime, noteToFrequency(note), 0.5, instrumentId);
  };
  
  const handleHitMouseDown = (e: React.MouseEvent, hit: Hit & {isResize?: boolean}, trackId: string) => {
    e.stopPropagation(); setActiveTrackId(trackId);
    
    let nextSelectedIds = selectedHitIds.has(hit.id) && !e.shiftKey ? new Set(selectedHitIds) : (e.shiftKey ? new Set(selectedHitIds) : new Set<string>());
    if (e.shiftKey) { if (selectedHitIds.has(hit.id)) nextSelectedIds.delete(hit.id); else nextSelectedIds.add(hit.id); } 
    else if (!selectedHitIds.has(hit.id)) nextSelectedIds = new Set([hit.id]);
    setSelectedHitIds(nextSelectedIds);

    const trackWidth = timelineContainerRefs.current.get(trackId)?.getBoundingClientRect().width ?? 0;
    const hitsForDrag = tracks.find(t => t.id === trackId)?.hits.filter(h => nextSelectedIds.has(h.id)) ?? [];
    
    setDraggingHit({
      startX: e.clientX, startY: e.clientY, trackWidth,
      isNoteDrag: hit.instrumentId !== 'drum', isResize: hit.isResize,
      noteRange: hit.instrumentId === 'piano' ? PIANO_NOTE_RANGE : GUITAR_NOTE_RANGE,
      dragGroup: hitsForDrag.map(h => ({ hitId: h.id, startTime: h.time, startDuration: h.duration, startNote: h.note, startDrumInstrumentId: h.drumInstrumentId })),
    });
  };
  
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>, trackId: string) => {
    const isTrack = (e.target as HTMLElement).classList.contains('track');
    if (isTrack) {
      setActiveTrackId(trackId);
      if (!e.shiftKey) { setSelectedHitIds(new Set<string>()); setInitialSelectionOnMarquee(new Set<string>()); } 
      else setInitialSelectionOnMarquee(new Set(selectedHitIds));
      setMarqueeRect({ trackId, startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY });
    }
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (draggingHit && activeTrackId) {
      const dTime = Math.round(((e.clientX - draggingHit.startX) / draggingHit.trackWidth) * totalStepsPerTrack);
      
      setTracks(prev => prev.map(t => {
        if (t.id !== activeTrackId) return t;
        return { ...t, hits: t.hits.map(h => {
          const dragInfo = draggingHit.dragGroup.find(g => g.hitId === h.id);
          if (!dragInfo) return h;
          
          let newHit = { ...h };
          const newTime = Math.max(0, Math.min(totalStepsPerTrack, dragInfo.startTime + dTime));

          if (draggingHit.isNoteDrag && dragInfo.startNote) { // Melodic note drag
            if (draggingHit.isResize) {
              newHit.duration = Math.max(1, (dragInfo.startDuration || 1) + dTime);
            } else {
              newHit.time = newTime;
              let noteIndexOffset = 0;
              const noteRange = draggingHit.noteRange || [];
              const key = `${activeInstrumentType}_${dragInfo.startNote}`;
              const startEl = instrumentTrackRefs.current.get(key);

              if (startEl) {
                  const startElBox = startEl.getBoundingClientRect();
                  const dy = e.clientY - (startElBox.top + startElBox.height / 2);
                  noteIndexOffset = -Math.round(dy / startElBox.height);
              }
              const currentNoteIdx = noteRange.indexOf(dragInfo.startNote);
              let newNoteIdx = Math.max(0, Math.min(noteRange.length - 1, currentNoteIdx + noteIndexOffset));
              newHit.note = noteRange[newNoteIdx];
            }
          } else if(dragInfo.startDrumInstrumentId) { // Drum hit drag
            newHit.time = newTime;
            let currentDrumInstId: string | null = null;
            for (const [id, el] of instrumentTrackRefs.current.entries()) {
              const [type, instId] = id.split('_');
              if (type === 'drum' && el && e.clientY >= el.getBoundingClientRect().top && e.clientY <= el.getBoundingClientRect().bottom) {
                currentDrumInstId = instId; break;
              }
            }
            if(currentDrumInstId) newHit.drumInstrumentId = currentDrumInstId;
          }
          return newHit;
        })};
      }));
    } else if (marqueeRect) { /* Marquee logic here */ }
  };
  
  const handleMouseUp = (e: MouseEvent) => {
    if (draggingHit) setDraggingHit(null);
    if (marqueeRect) {
      if (Math.abs(e.clientX - marqueeRect.startX) < 5 && Math.abs(e.clientY - marqueeRect.startY) < 5) {
        const timelineBounds = timelineContainerRefs.current.get(marqueeRect.trackId)?.getBoundingClientRect();
        if (timelineBounds) {
            const time = ((e.clientX - timelineBounds.left) / timelineBounds.width) * totalStepsPerTrack;
            if (time < 0 || time > totalStepsPerTrack) { setMarqueeRect(null); return; }
            
            let newHit: Hit | null = null;
            for (const [id, el] of instrumentTrackRefs.current.entries()) {
                const [type, instIdOrNote] = id.split('_');
                if (el && e.clientY >= el.getBoundingClientRect().top && e.clientY <= el.getBoundingClientRect().bottom) {
                    if(type === 'drum') newHit = { id: crypto.randomUUID(), instrumentId: 'drum', drumInstrumentId: instIdOrNote, time };
                    else if (type === activeInstrumentType) newHit = { id: crypto.randomUUID(), instrumentId: activeInstrumentType, note: instIdOrNote, time, duration: timeSignatureData.stepsPerBeat };
                    break;
                }
            }
            if (newHit) setTracks(prev => prev.map(t => t.id === marqueeRect.trackId ? { ...t, hits: [...t.hits, newHit!] } : t));
        }
      }
      setMarqueeRect(null);
    }
  };
  
  useEffect(() => {
    if (draggingHit || marqueeRect) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingHit, marqueeRect]);

  const handleAddHitsToActiveTrack = useCallback((newHits: Hit[]) => {
    const targetId = activeTrackId || (tracks.length > 0 ? tracks[0].id : null);
    if (targetId) setTracks(prev => prev.map(t => t.id === targetId ? { ...t, hits: [...t.hits, ...newHits] } : t));
  }, [activeTrackId, tracks]);

  const getVocalSoundsForInstrument = useCallback((instrumentId: string): string[] => Object.entries(vocalSoundMap).filter(([, id]) => id === instrumentId).map(([sound]) => sound), [vocalSoundMap]);
  
  const handleVocalSoundChange = useCallback((instrumentId: string, newSounds: string) => {
    setVocalSoundMap(prevMap => {
        const newMap = { ...prevMap };
        // 1. Remove all existing mappings for this instrumentId
        Object.keys(newMap).forEach(sound => {
            if (newMap[sound] === instrumentId) {
                delete newMap[sound];
            }
        });
        // 2. Add the new mappings
        newSounds.split(',').forEach(sound => {
            const trimmedSound = sound.trim();
            if (trimmedSound) {
                newMap[trimmedSound] = instrumentId;
            }
        });
        return newMap;
    });
  }, []);

  const handleDownloadMidi = () => {
    const midiBlob = new Blob([generateMidi(tracks, bpm, timeSignature, timeSignatureData, bars)], { type: 'audio/midi' });
    const url = URL.createObjectURL(midiBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'VoiceBeats-composition.mid';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleAddTrack = () => {
    if (tracks.length >= MAX_TRACKS) return;
    const newTrack: Track = { id: crypto.randomUUID(), hits: [], pianoOctave: 4, guitarOctave: 3 };
    setTracks(prev => [...prev, newTrack]); setActiveTrackId(newTrack.id);
  };

  const handleDeleteTrack = (trackId: string) => {
    const remainingTracks = tracks.filter(t => t.id !== trackId);
    setTracks(remainingTracks);
    if (activeTrackId === trackId) {
        setActiveTrackId(remainingTracks.length > 0 ? remainingTracks[0].id : null);
    }
  };
  
  const handleOpenSidebar = () => {
    setIsSidebarCollapsed(false);
  };
  
  const handleTrackOctaveChange = (trackId: string, instrumentType: 'piano' | 'guitar', newOctave: number) => {
    setTracks(prev => prev.map(t => {
        if (t.id === trackId) {
            if (instrumentType === 'piano') return { ...t, pianoOctave: newOctave };
            if (instrumentType === 'guitar') return { ...t, guitarOctave: newOctave };
        }
        return t;
    }));
  };

  const timelineWidth = useMemo(() => bars * BAR_WIDTH_PX, [bars]);
  
  return (
    <div className="bg-gray-950 text-white h-screen font-sans flex flex-col p-4 sm:p-8">
      {isTutorialActive && (
        <Tutorial
          step={tutorialStep}
          onNext={() => setTutorialStep(s => s + 1)}
          onPrev={() => setTutorialStep(s => s - 1)}
          onClose={handleTutorialClose}
          targets={{
            voiceMapping: voiceMappingRef.current,
            sidebarToggle: sidebarToggleRef.current,
            firstTrack: firstTrackRef.current,
            downloadButton: downloadButtonRef.current,
          }}
        />
      )}
      <header className="text-center mb-6 flex-shrink-0">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">VoiceBeats Studio</h1>
      </header>
      
      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-screen-2xl mx-auto flex-grow min-h-0">
        <div className="relative z-30 flex flex-shrink-0">
          <Instruments isCollapsed={isSidebarCollapsed} onDrumPreview={handleDrumPreview} onMelodicPreview={handleMelodicPreview} getVocalSoundsForInstrument={getVocalSoundsForInstrument} onVocalSoundChange={handleVocalSoundChange} melodicSyllableMap={melodicSyllableMap} onMelodicSyllableChange={(instId, note, syllable) => setMelodicSyllableMap(p => ({ ...p, [instId]: {...p[instId], [note]: syllable} }))} pianoScale={activeTrack?.pianoOctave ?? 4} onPianoScaleChange={(newScale) => { if(activeTrackId) handleTrackOctaveChange(activeTrackId, 'piano', newScale)}} guitarScale={activeTrack?.guitarOctave ?? 3} onGuitarScaleChange={(newScale) => { if(activeTrackId) handleTrackOctaveChange(activeTrackId, 'guitar', newScale)}} />
          <button ref={sidebarToggleRef} onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="bg-indigo-900 text-indigo-300 hover:bg-indigo-800 h-16 p-1 rounded-r-lg self-center border-l-2 border-indigo-700" title={isSidebarCollapsed ? 'Expand' : 'Collapse'}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        </div>

        <main className="flex-grow flex flex-col min-h-0 min-w-0">
          <GlobalControls bpm={bpm} onBpmChange={setBpm} timeSignature={timeSignature} onTimeSignatureChange={setTimeSignature} metronomeOn={metronomeOn} onMetronomeToggle={() => setMetronomeOn(p => !p)} isPlayingAll={isPlayingAll} onPlayAllToggle={() => isPlayingAll ? stopPlayback() : startPlayback('all')} bars={bars} onBarsChange={setBars} />
          
          <div ref={voiceMappingRef} className="bg-gray-950/80 backdrop-blur-sm z-10 sticky top-0 py-2">
            <VoiceMapping vocalSoundMap={vocalSoundMap} melodicSyllableMap={melodicSyllableMap} activeInstrumentType={activeInstrumentType} totalDurationSecs={totalDurationPerTrackSecs} totalSteps={totalStepsPerTrack} onAddHits={handleAddHitsToActiveTrack} />
            <InstrumentTypeSelector activeType={activeInstrumentType} onTypeChange={setActiveInstrumentType} />
          </div>

          <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 -mr-2">
            <div className="space-y-6">
              {tracks.map((track, index) => (
                <MidiEditor
                  key={track.id}
                  ref={index === 0 ? firstTrackRef : null}
                  downloadButtonRef={index === 0 ? downloadButtonRef : undefined}
                  track={track}
                  trackNumber={index + 1}
                  isActive={track.id === activeTrackId}
                  isPlaying={playingTrackId === track.id}
                  instrumentType={activeInstrumentType}
                  activeNotes={activeNotes}
                  onSetActive={() => setActiveTrackId(track.id)}
                  selectedHitIds={selectedHitIds}
                  currentStep={isPlayingAll || playingTrackId === track.id ? currentStep : -1}
                  timelineWidth={timelineWidth}
                  renderedMarquee={marqueeRect && marqueeRect.trackId === track.id ? <div className="absolute bg-blue-500/20 border border-blue-400 pointer-events-none z-50" style={{ left: Math.min(marqueeRect.startX, marqueeRect.endX) - (trackBodyRefs.current.get(track.id)?.getBoundingClientRect().left ?? 0), top: Math.min(marqueeRect.startY, marqueeRect.endY) - (trackBodyRefs.current.get(track.id)?.getBoundingClientRect().top ?? 0), width: Math.abs(marqueeRect.endX - marqueeRect.startX), height: Math.abs(marqueeRect.endY - marqueeRect.startY) }}/> : null}
                  timeSignatureData={timeSignatureData}
                  totalSteps={totalStepsPerTrack}
                  octave={activeInstrumentType === 'piano' ? track.pianoOctave : track.guitarOctave}
                  onOctaveChange={(newOctave) => handleTrackOctaveChange(track.id, activeInstrumentType as 'piano' | 'guitar', newOctave)}
                  onHitMouseDown={(e, hit) => handleHitMouseDown(e, hit, track.id)}
                  onDeleteHit={(hitId) => {
                    setTracks(p => p.map(t => t.id === track.id ? { ...t, hits: t.hits.filter(h => h.id !== hitId) } : t));
                    setSelectedHitIds(prev => { const next = new Set(prev); next.delete(hitId); return next; });
                  }}
                  onPlayToggle={() => playingTrackId === track.id ? stopPlayback() : startPlayback('single', track.id)}
                  onClear={() => setTracks(p => p.map(t => t.id === track.id ? { ...t, hits: t.hits.filter(h => h.instrumentId !== activeInstrumentType) } : t))}
                  onDownloadMidi={handleDownloadMidi}
                  onOpenSettings={handleOpenSidebar}
                  onTimelineMouseDown={(e) => handleTimelineMouseDown(e, track.id)}
                  onDeleteTrack={() => handleDeleteTrack(track.id)}
                  timelineContainerRef={el => timelineContainerRefs.current.set(track.id, el)}
                  setInstrumentTrackRef={(instId, el) => instrumentTrackRefs.current.set(instId, el)}
                  trackBodyRef={el => trackBodyRefs.current.set(track.id, el)}
                />
              ))}
            </div>
            <button 
                onClick={handleAddTrack} 
                disabled={tracks.length >= MAX_TRACKS}
                title={tracks.length >= MAX_TRACKS ? `Maximum of ${MAX_TRACKS} tracks reached` : "Add a new track"}
                className="w-full mt-6 bg-indigo-700 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg disabled:bg-gray-700 disabled:cursor-not-allowed">
              + Add Track
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
