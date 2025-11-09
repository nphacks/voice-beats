import React, { useMemo, useEffect, useState } from 'react';

// Define the shape of a tutorial step
interface TutorialStepConfig {
  title: string;
  content: string;
  targetKey: keyof TutorialTargets | null;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

// Define the object holding target elements
interface TutorialTargets {
  voiceMapping: HTMLElement | null;
  sidebarToggle: HTMLElement | null;
  firstTrack: HTMLElement | null;
  downloadButton: HTMLElement | null;
}

interface TutorialProps {
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  targets: TutorialTargets;
}

const tutorialSteps: TutorialStepConfig[] = [
    {
        title: 'Welcome to VoiceBeats!',
        content: "Let's take a quick tour to see how you can turn your voice into music.",
        targetKey: null,
    },
    {
        title: '1. Voice to Music',
        content: "Record your voice or upload audio here. The AI will create notes from your sounds.",
        targetKey: 'voiceMapping',
        position: 'bottom',
    },
    {
        title: '2. Customize Your Sounds',
        content: "Click to open settings. Here, you can map your custom sounds (e.g., 'boom' for kick) to instruments.",
        targetKey: 'sidebarToggle',
        position: 'right',
    },
    {
        title: '3. Edit Your Track',
        content: "Directly edit notes on the timeline. Click to add, drag to move. Use the track's Play button to listen.",
        targetKey: 'firstTrack',
        position: 'top',
    },
    {
        title: '4. Export Your Masterpiece',
        content: "Happy with your beat? Click here to download the MIDI file for any music software.",
        targetKey: 'downloadButton',
        position: 'top',
    }
];


export const Tutorial: React.FC<TutorialProps> = ({ step, onNext, onPrev, onClose, targets }) => {
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const currentStepConfig = tutorialSteps[step];
    
    useEffect(() => {
        if (!currentStepConfig) {
            onClose(); // End of tutorial
            return;
        }

        const targetElement = currentStepConfig.targetKey ? targets[currentStepConfig.targetKey] : null;

        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            setTargetRect(rect);
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        } else {
            setTargetRect(null); // For centered steps
        }

    }, [step, targets, currentStepConfig, onClose]);

    if (!currentStepConfig) return null;

    const popoverStyle: React.CSSProperties = useMemo(() => {
        if (!targetRect) { // Center it for welcome screen
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                maxWidth: '500px'
            };
        }
        
        const position = currentStepConfig.position || 'bottom';
        const offset = 12; // 12px gap

        switch (position) {
            case 'top':
                return { top: targetRect.top - offset, left: targetRect.left + targetRect.width / 2, transform: 'translate(-50%, -100%)' };
            case 'bottom':
                return { top: targetRect.bottom + offset, left: targetRect.left + targetRect.width / 2, transform: 'translate(-50%, 0)' };
            case 'left':
                return { top: targetRect.top + targetRect.height / 2, left: targetRect.left - offset, transform: 'translate(-100%, -50%)' };
            case 'right':
                return { top: targetRect.top + targetRect.height / 2, left: targetRect.right + offset, transform: 'translate(0, -50%)' };
            default:
                return {};
        }

    }, [targetRect, currentStepConfig]);


    return (
        <div className="fixed inset-0 z-50">
            {/* Overlay */}
            {targetRect ? (
                <div
                    className="absolute transition-all duration-500 ease-in-out border-2 border-indigo-500 rounded-lg pointer-events-none"
                    style={{
                        top: targetRect.top - 4,
                        left: targetRect.left - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                        boxShadow: '0 0 20px 5px rgba(99, 102, 241, 0.7), 0 0 0 9999px rgba(0, 0, 0, 0.7)',
                    }}
                ></div>
            ) : (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={(e) => e.stopPropagation()}></div>
            )}
            
            {/* Popover */}
            <div 
                className="absolute bg-gray-900 border border-indigo-700 rounded-xl shadow-2xl p-6 w-80 z-10 transition-all duration-500 ease-in-out animate-fade-in-up" 
                style={popoverStyle}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-xl font-bold text-white mb-2">{currentStepConfig.title}</h3>
                <p className="text-indigo-200 mb-4">{currentStepConfig.content}</p>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">{step + 1} / {tutorialSteps.length}</span>
                    <div className="flex gap-2">
                        {step > 0 && (
                            <button onClick={onPrev} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-md text-sm transition">Back</button>
                        )}
                        {step < tutorialSteps.length - 1 ? (
                            <button onClick={onNext} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1 px-3 rounded-md text-sm transition">Next</button>
                        ) : (
                             <button onClick={onClose} className="bg-green-600 hover:bg-green-500 text-white font-semibold py-1 px-3 rounded-md text-sm transition">Finish</button>
                        )}
                    </div>
                </div>
                 <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white transition" title="Skip Tutorial">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
            </div>
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};