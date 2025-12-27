import React, { useRef, useEffect, useState } from 'react';
import { GeneratedPattern, DrumInstrument, DrumNote } from '../types';

interface VisualizerProps {
  pattern: GeneratedPattern | null;
  isPlaying: boolean;
  currentStepRef: React.MutableRefObject<number>;
}

const INSTRUMENT_LABELS: Record<DrumInstrument, string> = {
  [DrumInstrument.CRASH]: 'CRASH',
  [DrumInstrument.RIDE]: 'RIDE',
  [DrumInstrument.HIHAT_OPEN]: 'OH',
  [DrumInstrument.HIHAT_CLOSED]: 'CH',
  [DrumInstrument.TOM_HIGH]: 'HT',
  [DrumInstrument.TOM_LOW]: 'LT',
  [DrumInstrument.SNARE]: 'SD',
  [DrumInstrument.KICK]: 'BD',
};

const DISPLAY_ORDER = [
  DrumInstrument.CRASH,
  DrumInstrument.RIDE,
  DrumInstrument.HIHAT_OPEN,
  DrumInstrument.HIHAT_CLOSED,
  DrumInstrument.TOM_HIGH,
  DrumInstrument.TOM_LOW,
  DrumInstrument.SNARE,
  DrumInstrument.KICK,
];

const Visualizer: React.FC<VisualizerProps> = React.memo(({ pattern, isPlaying, currentStepRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localStep, setLocalStep] = useState(-1);

  // High performance loop for visual updates only
  useEffect(() => {
    let animationFrameId: number;

    const renderLoop = () => {
      if (isPlaying) {
        // Only update state if it actually changed to prevent some react overhead
        const actualStep = currentStepRef.current;
        setLocalStep(prev => (prev !== actualStep ? actualStep : prev));
      } else {
        setLocalStep(-1);
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, currentStepRef]);

  // Auto-scroll logic focused on center
  useEffect(() => {
    if (!pattern || !containerRef.current || localStep === -1) return;
    const STEP_WIDTH = 32; 
    const viewWidth = containerRef.current.clientWidth;
    const targetLeft = (localStep * STEP_WIDTH) - (viewWidth / 2) + (STEP_WIDTH / 2);
    // Use immediate scroll if skipping far, smooth otherwise? Smooth is fine.
    containerRef.current.scrollTo({ left: targetLeft, behavior: 'smooth' });
  }, [localStep, pattern]);

  if (!pattern) return (
    <div className="h-64 w-full flex items-center justify-center border border-slate-700 rounded-lg bg-slate-800/50 text-slate-500 font-mono text-sm">
      <p>WAITING_FOR_INPUT...</p>
    </div>
  );

  const steps = pattern.totalSteps;
  const STEP_WIDTH_PX = 32;
  const totalWidth = steps * STEP_WIDTH_PX;

  const getNote = (inst: DrumInstrument, step: number): DrumNote | undefined => {
    return pattern.notes.find(n => n.instrument === inst && n.step === step);
  };

  return (
    <div 
        ref={containerRef}
        className="w-full h-full overflow-x-auto rounded-lg border border-slate-700 bg-slate-900 shadow-inner scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900"
    >
      <div 
        className="h-full flex flex-col justify-center py-4 px-4"
        style={{ width: `${Math.max(800, totalWidth + 100)}px` }} 
      >
        {/* Header (Step Markers) */}
        <div className="flex mb-2 ml-12 border-b border-slate-800 pb-2 relative">
           {Array.from({ length: steps }).map((_, i) => {
             const isBeat = i % 4 === 0;
             return (
               <div 
                  key={i} 
                  className={`flex-shrink-0 text-center font-mono text-[10px] flex flex-col justify-end pb-1
                    ${i === localStep ? 'text-cyan-400 font-bold' : 'text-slate-600'}
                  `}
                  style={{ width: `${STEP_WIDTH_PX}px` }}
               >
                 {isBeat ? (Math.floor(i / 4) + 1) : '·'}
               </div>
             )
           })}
        </div>

        {/* Grid Rows */}
        <div className="flex flex-col gap-1.5">
          {DISPLAY_ORDER.map((inst) => (
            <div key={inst} className="flex items-center h-8">
              <div className="w-12 text-[10px] font-mono text-slate-500 font-bold text-right pr-3 tracking-wider">
                {INSTRUMENT_LABELS[inst]}
              </div>
              
              <div className="flex-1 flex h-full relative">
                <div className="absolute inset-0 flex pointer-events-none">
                    {Array.from({ length: steps }).map((_, i) => (
                        <div key={`grid-${i}`} 
                            className={`border-r ${i % 4 === 0 ? 'border-slate-800' : 'border-slate-800/30'}`} 
                            style={{ width: `${STEP_WIDTH_PX}px` }} 
                        />
                    ))}
                </div>

                {Array.from({ length: steps }).map((_, stepIndex) => {
                  const note = getNote(inst, stepIndex);
                  const isActive = stepIndex === localStep;
                  
                  let bgClass = 'bg-transparent'; 
                  let borderClass = '';
                  let opacity = 0;

                  if (note) {
                      bgClass = 'bg-cyan-500';
                      opacity = 0.3 + (note.velocity * 0.7); 
                  }
                  
                  if (isActive) {
                    borderClass = 'ring-1 ring-white/40 z-10'; 
                    if (!note) bgClass = 'bg-white/5';
                  }

                  return (
                    <div 
                      key={stepIndex}
                      className={`flex-shrink-0 h-full rounded-sm transition-all relative group ${borderClass}`}
                      style={{ width: `${STEP_WIDTH_PX}px`, padding: '2px' }}
                    >
                      {note && (
                        <div 
                            className={`w-full h-full rounded-sm shadow-[0_0_10px_rgba(6,182,212,0.3)] ${bgClass}`}
                            style={{ opacity }}
                        >
                        </div>
                      )}
                      
                      {!note && isActive && (
                          <div className="w-full h-full bg-white/5 rounded-sm" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default Visualizer;