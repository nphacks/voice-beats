# VoiceBeats Studio 🎹🎤

**Turn your voice into music. A browser-based, AI-powered drum and melody machine that transcribes your vocalizations into a multi-track MIDI sequence.**

![VoiceBeats Studio Screenshot](https://storage.googleapis.com/aistudio-public/gallery/2cfa2f8a-c47d-4c3e-b5c4-722055653b6e.png)

VoiceBeats Studio bridges the gap between musical ideas and digital creation. Simply beatbox, sing, or upload an audio recording, and watch as our AI engine maps your sounds to a fully editable musical score.

---

## ✨ Core Features

*   **🎙️ Voice-to-MIDI Transcription**: Record your voice or upload an audio file. Google's Gemini API analyzes the audio and automatically generates drum beats or melodic lines.
*   **🎹 Multi-Instrument Support**: Compose with a classic drum kit (Kick, Snare, Hi-hat, Clap, Tom) and melodic instruments (Piano, Guitar).
*   **🎼 Multi-Track Sequencer**: Build complex arrangements by layering multiple, independent instrument tracks.
*   **✍️ Intuitive MIDI Editor**: A powerful and familiar piano roll/drum sequencer interface. Easily add, delete, move, and resize notes to perfect your composition.
*   **🗣️ Custom Vocal Triggers**: You are the instrument! Map your own unique sounds (e.g., "boom", "b", "ka") to drum parts, and assign sung syllables (e.g., "do", "re", "mi") to specific notes.
*   **🎛️ Global Controls**: Fine-tune your project with controls for BPM, time signature (4/4, 3/4, 6/8), and the number of bars per track.
*   **⏯️ Flexible Playback**: Audition individual tracks or play the entire composition in sync. A built-in metronome helps you keep time.
*   **💾 MIDI Export**: Download your finished piece as a standard `.mid` file, ready to be imported into any Digital Audio Workstation (DAW) like Ableton Live, FL Studio, or Logic Pro.
*   **🚀 Web-Based**: No installation required. Built entirely with modern web technologies.

---

## 🛠️ Technology Stack

*   **Frontend**: React, TypeScript, Tailwind CSS
*   **AI/ML**: Google Gemini API for advanced audio-to-text transcription.
*   **Audio Synthesis**: Web Audio API for real-time, in-browser instrument sound generation.
*   **Core Logic**: State management and UI reactivity handled by React Hooks.

---

## ⚙️ How It Works

1.  **User Input**: The user records their voice directly in the browser or uploads a pre-existing audio file.
2.  **Gemini Transcription**: The audio data is sent to the Gemini API with a specialized prompt. The prompt instructs the model to transcribe the sounds (distinguishing between beatboxing and singing) and return each distinct "word" along with its precise start time. A strict JSON schema is enforced on the response to ensure data consistency.
3.  **Vocal Mapping**: The application's logic parses the structured response from Gemini. It then cross-references the transcribed words/syllables with the user's custom mappings (e.g., "boom" -> "kick", "do" -> "C4").
4.  **Hit Generation**: For each successfully mapped sound, a `Hit` object is created. This object contains its instrument ID, precise timing within the sequence, and, for melodic hits, the specific note and its duration.
5.  **Sequencer Update**: The newly generated hits are dynamically added to the active track in the MIDI editor, providing immediate visual feedback.
6.  **Audio Playback**: The Web Audio API is used to schedule and synthesize all instrument sounds based on the data in the sequencer, ensuring sample-accurate playback.

---

## 🚀 How to Use

1.  **Configure Your Instruments**: Open the left sidebar.
    *   For **Drums**, type the vocal sounds you want to use for each instrument, separated by commas (e.g., `boom, b` for Kick).
    *   For **Piano/Guitar**, assign sung syllables to specific notes (e.g., `do` for C4). You can also change the active octave for the instrument here.
2.  **Select a Track**: Click on a track in the main editor area to make it the active target for recording.
3.  **Record or Upload**:
    *   Click the **"Record Voice"** button, make your sounds, and click "Stop Recording".
    *   Alternatively, click **"Upload Audio"** to use an existing file.
4.  **AI Generation**: Wait a moment as Gemini processes the audio. The corresponding notes and drum hits will automatically appear on the active track's timeline.
5.  **Edit and Refine**:
    *   **Move**: Click and drag any hit to adjust its timing or (for drums) assign it to a different instrument.
    *   **Resize**: Drag the right edge of a melodic note to change its duration.
    *   **Delete**: Double-click any hit to remove it.
    *   **Multi-Select**: Hold `Shift` while clicking hits to select multiple at once.
6.  **Compose**: Click **"+ Add Track"** to layer more instruments. Use the global and track-specific play buttons to listen to your creation.
7.  **Export**: When your masterpiece is complete, click **"Download MIDI"** to save your composition.

---

## 📁 Project Structure

```
/
├── index.html            # Main HTML entry point
├── index.tsx             # Renders the React app
├── App.tsx               # Main application component, handles state and core logic
├── components/
│   ├── MidiEditor.tsx      # The core sequencer/piano roll UI for a single track
│   ├── VoiceMapping.tsx    # Handles audio recording, upload, and Gemini API calls
│   ├── Instruments.tsx     # The collapsible left sidebar for instrument configuration
│   └── GlobalControls.tsx  # Top-level controls (BPM, Play All, Time Signature)
├── synth.ts              # Web Audio API functions for generating synth sounds
├── midi.ts               # Logic for converting track data to a .mid file
├── constants.ts          # Static data (instrument definitions, note ranges)
└── models.ts             # TypeScript type definitions for the application
```
