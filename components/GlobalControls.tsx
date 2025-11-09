import React from 'react';

interface GlobalControlsProps {
  bpm: number;
  onBpmChange: (value: number) => void;
  timeSignature: string;
  onTimeSignatureChange: (value: string) => void;
  metronomeOn: boolean;
  onMetronomeToggle: () => void;
  onPlayAllToggle: () => void;
  isPlayingAll: boolean;
  bars: number;
  onBarsChange: (value: number) => void;
}

export const GlobalControls: React.FC<GlobalControlsProps> = ({
  bpm,
  onBpmChange,
  timeSignature,
  onTimeSignatureChange,
  metronomeOn,
  onMetronomeToggle,
  onPlayAllToggle,
  isPlayingAll,
  bars,
  onBarsChange,
}) => {
  return (
    <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-xl shadow-lg w-full mb-4 flex-shrink-0 z-20 sticky top-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <button onClick={onPlayAllToggle} className={`w-28 text-white font-semibold py-2 px-4 rounded-md transition text-lg ${isPlayingAll ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}>
            {isPlayingAll ? 'Stop' : 'Play All'}
          </button>
          <div className="flex items-center gap-3">
            <label htmlFor="bpm-input" className="font-medium text-lg shrink-0">BPM</label>
            <input
                type="number"
                id="bpm-input"
                min="60"
                max="240"
                value={bpm}
                onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                        onBpmChange(Math.max(60, Math.min(240, val)));
                    }
                }}
                className="bg-gray-800 border border-indigo-800 rounded-md py-1 px-2 text-white w-20 text-center focus:ring-indigo-500 focus:border-indigo-500"
            />
            <input
                type="range"
                id="bpm-slider"
                aria-label="BPM Slider"
                min="60"
                max="240"
                value={bpm}
                onChange={(e) => onBpmChange(Number(e.target.value))}
                className="w-24 sm:w-32 accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div>
            <label htmlFor="bars" className="text-sm font-medium mr-2">Bars per Track</label>
            <input id="bars" type="number" min="1" max="8" value={bars} onChange={(e) => onBarsChange(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} className="bg-gray-800 border border-indigo-800 rounded-md py-1 px-2 text-white w-16 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label htmlFor="time-signature" className="text-sm font-medium mr-2">Time Signature</label>
            <select id="time-signature" value={timeSignature} onChange={(e) => onTimeSignatureChange(e.target.value)} className="bg-gray-800 border border-indigo-800 rounded-md py-1 px-2 text-white focus:ring-indigo-500 focus:border-indigo-500">
              <option value="4/4">4/4</option><option value="3/4">3/4</option><option value="6/8">6/8</option>
            </select>
          </div>
          <button onClick={onMetronomeToggle} className={`font-semibold py-2 px-4 rounded-md transition ${metronomeOn ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-gray-800 hover:bg-indigo-900 text-indigo-400 border border-indigo-700'}`}>
            Metronome: {metronomeOn ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
};