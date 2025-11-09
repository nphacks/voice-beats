import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { Hit, InstrumentType } from '../models';

interface VoiceMappingProps {
  vocalSoundMap: Record<string, string>;
  melodicSyllableMap: Record<string, Record<string, string>>;
  activeInstrumentType: InstrumentType;
  totalDurationSecs: number;
  totalSteps: number;
  onAddHits: (newHits: Hit[]) => void;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data.substring(base64data.indexOf(',') + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const VoiceMapping: React.FC<VoiceMappingProps> = ({
  vocalSoundMap, melodicSyllableMap, activeInstrumentType,
  totalDurationSecs, totalSteps, onAddHits
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runGeminiTranscription = async (audioBlob: Blob) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const audioData = await blobToBase64(audioBlob);

    const prompt = activeInstrumentType === 'drum'
      ? "Transcribe the following audio, providing the start time in seconds for each word. The audio contains human beatboxing sounds. Transcribe them as best as you can, for example 'boom', 'tss', 'ka'."
      : `Transcribe the following audio of someone singing syllables like 'do', 're', 'mi', etc. Provide the start time in seconds for each word.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        words: { type: Type.ARRAY, items: { type: Type.OBJECT,
            properties: { word: { type: Type.STRING }, startTime: { type: Type.NUMBER }, },
            required: ['word', 'startTime'],
          },
        },
      },
      required: ['words'],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [ { text: prompt }, { inlineData: { data: audioData, mimeType: audioBlob.type, }, }, ], },
      config: { responseMimeType: 'application/json', responseSchema: responseSchema, },
    });
    return JSON.parse(response.text);
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessingAudio(true); setProcessingError(null);
    try {
      const result = await runGeminiTranscription(audioBlob);
      if (!result.words || result.words.length === 0) {
        setProcessingError("Couldn't detect any sounds. Please try again.");
        return;
      }

      const newHits: Hit[] = [];
      const { words } = result; // API response is not strictly typed.

      if (activeInstrumentType === 'drum') {
        for (const item of words) {
          const word = item.word.toLowerCase().trim().replace(/[.,!?]/g, '');
          const drumInstrumentId = vocalSoundMap[word];
          if (drumInstrumentId) {
            const time = (item.startTime / totalDurationSecs) * totalSteps;
            if (time >= 0 && time <= totalSteps) {
              newHits.push({ id: crypto.randomUUID(), instrumentId: 'drum', time, drumInstrumentId, });
            }
          }
        }
      } else { // Melodic
        const instrumentMap = Object.entries(melodicSyllableMap[activeInstrumentType]).reduce((acc, [note, syllable]) => {
            if(syllable) acc[syllable.toLowerCase().trim()] = note;
            return acc;
        }, {} as Record<string, string>);
        
        for (let i = 0; i < words.length; i++) {
          const item = words[i];
          const word = item.word.toLowerCase().trim().replace(/[.,!?]/g, '');
          const note = instrumentMap[word];
          if (note) {
            const startTimeSec = item.startTime;
            const nextItem = words[i + 1];
            const endTimeSec = nextItem ? nextItem.startTime : totalDurationSecs;
            const time = (startTimeSec / totalDurationSecs) * totalSteps;
            const duration = ((endTimeSec - startTimeSec) / totalDurationSecs) * totalSteps;
            if (time >= 0 && time <= totalSteps) {
              newHits.push({
                id: crypto.randomUUID(), instrumentId: activeInstrumentType, time, note,
                duration: Math.max(1, duration), // Ensure minimum duration
              });
            }
          }
        }
      }

      if (newHits.length > 0) onAddHits(newHits);
      else setProcessingError(`No matching ${activeInstrumentType} sounds found in the audio.`);

    } catch (error) {
      console.error("Error processing audio:", error);
      setProcessingError("Failed to process audio. Please try again.");
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const handleRecordClick = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop(); setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream); audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = event => audioChunksRef.current.push(event.data);
        mediaRecorderRef.current.onstop = () => {
          processAudio(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
          stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorderRef.current.start(); setIsRecording(true); setProcessingError(null);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        setProcessingError("Microphone access denied.");
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processAudio(file);
    if(event.target) event.target.value = '';
  };

  return (
    <section className="bg-gray-900 p-4 rounded-xl shadow-lg w-full mb-6">
      <div className="flex items-center gap-4">
        <button onClick={handleRecordClick} disabled={isProcessingAudio} className={`w-36 text-white font-semibold py-2 px-4 rounded-md transition ${isRecording ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-500'} disabled:bg-gray-500 disabled:cursor-not-allowed`}>
          {isRecording ? 'Stop Recording' : 'Record Voice'}
        </button>
        <button onClick={() => fileInputRef.current?.click()} disabled={isProcessingAudio || isRecording} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-4 rounded-md transition disabled:bg-gray-500 disabled:cursor-not-allowed">
          Upload Audio
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" className="hidden" />
      </div>
      {isProcessingAudio && <p className="text-yellow-400 mt-3">Processing audio, please wait...</p>}
      {processingError && <p className="text-red-400 mt-3">{processingError}</p>}
    </section>
  );
};