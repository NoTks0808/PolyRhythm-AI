import React, { useState, useEffect, useRef } from 'react';
import { TIME_SIGNATURE_OPTIONS, SUGGESTED_PROMPTS } from './constants';
import { GeneratedPattern, DrumInstrument, DrumKit } from './types';
import { generateDrumPattern } from './services/geminiService';
import { audioEngine } from './services/audioEngine';
import { generateMidiBlob } from './services/midiService';
import Visualizer from './components/Visualizer';

// Icons
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const StopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
const MusicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/></svg>;
const AudioWaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;

function App() {
  // State
  const [prompt, setPrompt] = useState('');
  
  // Rhythm State
  const [timeSignature, setTimeSignature] = useState('11/8');
  // New: Custom Time Signature State
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customNum, setCustomNum] = useState('15');
  const [customDen, setCustomDen] = useState('16');

  const [bpm, setBpm] = useState(130);
  const [bars, setBars] = useState(2); 
  const [selectedKit, setSelectedKit] = useState<DrumKit>(DrumKit.ACOUSTIC);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pattern, setPattern] = useState<GeneratedPattern | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isExportingWav, setIsExportingWav] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const patternRef = useRef<GeneratedPattern | null>(null);

  useEffect(() => { patternRef.current = pattern; }, [pattern]);
  useEffect(() => { audioEngine.setKit(selectedKit); }, [selectedKit]);

  // Audio Logic
  const scheduleNote = (stepNumber: number, time: number, currentPattern: GeneratedPattern) => {
    currentPattern.notes.forEach(note => {
      if (note.step === stepNumber) {
        audioEngine.trigger(note.instrument, time, note.velocity);
      }
    });
  };

  const scheduler = () => {
    // Increased lookahead to prevent CPU jitter causing audio dropouts/glitches
    const lookahead = 50.0; 
    const scheduleAheadTime = 0.1; 

    if (!patternRef.current || !isPlayingRef.current) return;
    const currentPattern = patternRef.current;

    while (nextNoteTimeRef.current < audioEngine.getCurrentTime() + scheduleAheadTime) {
      scheduleNote(currentStepRef.current, nextNoteTimeRef.current, currentPattern);
      
      const secondsPerBeat = 60.0 / currentPattern.bpm;
      const subdivisions = currentPattern.subdivisionsPerBeat || 4;
      const stepDuration = secondsPerBeat / subdivisions;
      
      nextNoteTimeRef.current += stepDuration;
      const nextStep = currentStepRef.current + 1;
      currentStepRef.current = nextStep === currentPattern.totalSteps ? 0 : nextStep;
    }
    timerIDRef.current = window.setTimeout(scheduler, lookahead);
  };
  
  const handlePlay = async () => {
    if (!pattern) return;
    if (isPlaying) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
      return;
    }
    try {
        setIsLoadingAudio(true);
        await audioEngine.init();
        setIsLoadingAudio(false);
        setIsPlaying(true);
        isPlayingRef.current = true;
        currentStepRef.current = 0;
        // Ensure we start slightly in the future to avoid immediate "catch up" glitches
        nextNoteTimeRef.current = audioEngine.getCurrentTime() + 0.1;
        scheduler();
    } catch (e) {
        setIsLoadingAudio(false);
        setError("Failed to load audio samples.");
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
        setError("Please enter a prompt.");
        return;
    }
    setIsGenerating(true);
    setError(null);
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
    
    // Determine Time Signature
    let finalSig = timeSignature;
    if (isCustomTime) {
        finalSig = `${customNum}/${customDen}`;
    }

    try {
      audioEngine.init().catch(console.error);
      const data = await generateDrumPattern({ 
          prompt, 
          timeSignature: finalSig, 
          bpm, 
          bars 
      });
      setPattern(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate pattern.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadMidi = () => {
    if (!pattern) return;
    const blob = generateMidiBlob(pattern);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polyrhythm_${pattern.timeSignature.replace('/','-')}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadWav = async () => {
      if (!pattern) return;
      try {
          setIsExportingWav(true);
          const blob = await audioEngine.exportWav(pattern);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `polyrhythm_${pattern.timeSignature.replace('/','-')}.wav`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      } catch (e) {
          setError("Failed to export WAV.");
      } finally {
          setIsExportingWav(false);
      }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
      
      {/* Background */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="w-full border-b border-slate-800/50 bg-slate-950/30 backdrop-blur-md sticky top-0 z-50">
         <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 3v18M3 10l18-4M3 18l18-4"/></svg>
                </div>
                <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  PolyRhythm AI
                </h1>
            </div>
            
            {/* Status Bar */}
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-500 tracking-wider">NET_ONLINE</span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-800"></div>
                    <div className="text-[10px] font-mono text-slate-400">
                        GAS: <span className="text-slate-200">2 Gwei</span>
                    </div>
                </div>

                <button className="group relative px-4 py-1.5 overflow-hidden rounded-md bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700 hover:border-cyan-500/50 hover:text-cyan-400 transition-all">
                    <span className="relative z-10 flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>
                        CONNECT_WALLET
                    </span>
                    <div className="absolute inset-0 bg-cyan-900/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
            </div>
         </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column */}
            <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* RHYTHM SECTION */}
                <section className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <SettingsIcon /> Rhythm Settings
                    </div>

                    <div className="space-y-6">
                        {/* Time Signature - UPDATED FOR CUSTOM */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs text-slate-400 block font-medium ml-1">Time Signature</label>
                                <button
                                    onClick={() => setIsCustomTime(!isCustomTime)}
                                    className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                                        isCustomTime 
                                        ? 'bg-cyan-500 border-cyan-400 text-white' 
                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    {isCustomTime ? 'USE PRESETS' : 'CUSTOM MODE'}
                                </button>
                            </div>

                            {!isCustomTime ? (
                                <div className="grid grid-cols-3 gap-2">
                                    {TIME_SIGNATURE_OPTIONS.map(ts => (
                                    <button
                                        key={ts}
                                        onClick={() => setTimeSignature(ts)}
                                        className={`relative h-10 text-sm font-semibold rounded-lg transition-all border ${
                                        timeSignature === ts 
                                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                                        : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                                        }`}
                                    >
                                        {ts}
                                    </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-slate-500 mb-1 block">Numerator</label>
                                            <input 
                                                type="number" 
                                                value={customNum}
                                                onChange={(e) => setCustomNum(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-center text-sm focus:border-cyan-500 outline-none font-mono"
                                                placeholder="15"
                                            />
                                        </div>
                                        <div className="text-xl text-slate-600 font-light">/</div>
                                        <div className="flex-1">
                                            <label className="text-[10px] text-slate-500 mb-1 block">Denominator</label>
                                            <select 
                                                value={customDen}
                                                onChange={(e) => setCustomDen(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-center text-sm focus:border-cyan-500 outline-none appearance-none font-mono"
                                            >
                                                <option value="4">4</option>
                                                <option value="8">8</option>
                                                <option value="16">16</option>
                                                <option value="32">32</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-[10px] text-slate-500 text-center italic">
                                        Result: <span className="text-cyan-400 font-mono">{customNum}/{customDen}</span> time
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* BPM & Loop Length */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-400 mb-2 block font-medium ml-1">Loop Length</label>
                                <div className="flex bg-slate-950/50 p-1 rounded-lg border border-slate-800">
                                    {[1, 2, 4].map(b => (
                                    <button
                                        key={b}
                                        onClick={() => setBars(b)}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                            bars === b
                                            ? 'bg-slate-800 text-slate-200 shadow-sm ring-1 ring-slate-700'
                                            : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                    >
                                        {b} Bar{b > 1 ? 's' : ''}
                                    </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-2 block font-medium ml-1">Tempo: {bpm} BPM</label>
                                <div className="flex items-center h-[38px]">
                                    <input 
                                        type="range" 
                                        min="60" 
                                        max="220" 
                                        value={bpm} 
                                        onChange={(e) => setBpm(Number(e.target.value))}
                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SOUND & GENERATION */}
                <section className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <MusicIcon /> Sound Design
                    </div>

                    {/* Drum Kit */}
                    <div>
                        <label className="text-xs text-slate-400 mb-2 block font-medium ml-1">Kit Selection</label>
                        <div className="flex bg-slate-950/50 p-1 rounded-lg border border-slate-800">
                            {Object.values(DrumKit).map(kit => (
                                <button
                                    key={kit}
                                    onClick={() => setSelectedKit(kit)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                                        selectedKit === kit
                                        ? 'bg-slate-800 text-cyan-400 shadow-sm ring-1 ring-slate-700'
                                        : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    {kit.charAt(0) + kit.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Prompt */}
                    <div>
                        <label className="text-xs text-slate-400 mb-2 block font-medium ml-1">Vibe & Style</label>
                        <textarea 
                            className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl p-3 text-sm focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none transition-all placeholder-slate-600 text-slate-300 resize-none"
                            rows={3}
                            placeholder="Describe the rhythm (e.g. Anxious, fast 7/8 beat with heavy ghost notes...)"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                            {SUGGESTED_PROMPTS.slice(0, 3).map((s, i) => (
                            <button 
                                key={i}
                                onClick={() => setPrompt(s)}
                                className="text-[10px] bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 px-2.5 py-1.5 rounded-md border border-slate-800 transition-colors"
                            >
                                {s}
                            </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all transform active:scale-[0.99] ${
                            isGenerating 
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/30 border border-cyan-500/20'
                        }`}
                    >
                        {isGenerating ? (
                            <>
                            <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span>
                            Composing...
                            </>
                        ) : (
                            <>
                            <SparklesIcon /> Generate Pattern
                            </>
                        )}
                    </button>
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg text-center">
                            {error}
                        </div>
                    )}
                </section>
            </div>

            {/* Right Column: Visualizer */}
            <div className="lg:col-span-8 flex flex-col h-full min-h-[600px]">
                <div className="flex-1 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative group">
                    
                    {/* Visualizer Header */}
                    <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-950/30 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-0.5">Current Pattern</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-cyan-400">{pattern ? pattern.timeSignature : (isCustomTime ? `${customNum}/${customDen}` : timeSignature)}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                    <span className="text-sm font-bold text-slate-300">{bpm} BPM</span>
                                </div>
                            </div>
                        </div>
                        
                        {pattern && (
                            <div className="hidden sm:block max-w-[300px] text-right">
                                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-0.5">AI Analysis</span>
                                <p className="text-xs text-slate-400 italic truncate">{pattern.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Visualizer Area */}
                    <div className="flex-1 relative bg-[#050B14] p-2">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-[0.05] pointer-events-none"></div>
                        <div className="relative h-full w-full rounded-lg border border-slate-800/30 overflow-hidden">
                             <Visualizer pattern={pattern} isPlaying={isPlaying} currentStepRef={currentStepRef} />
                        </div>
                    </div>

                    {/* Footer Controls */}
                    <div className="px-6 py-5 border-t border-slate-800/50 bg-slate-950/50 flex flex-wrap gap-4 items-center justify-between z-10">
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                             <button
                                onClick={handlePlay}
                                disabled={!pattern || isLoadingAudio}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-8 py-3 rounded-full font-bold text-sm transition-all shadow-lg active:scale-95 ${
                                !pattern 
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                : isPlaying 
                                    ? 'bg-red-500 text-white shadow-red-900/30 hover:bg-red-600'
                                    : 'bg-emerald-500 text-white shadow-emerald-900/30 hover:bg-emerald-600'
                                }`}
                            >
                                {isLoadingAudio ? (
                                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                ) : (
                                    isPlaying ? <><StopIcon /> STOP</> : <><PlayIcon /> PREVIEW</>
                                )}
                            </button>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={handleDownloadMidi}
                                disabled={!pattern}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold border transition-all ${
                                    !pattern
                                    ? 'border-slate-800 text-slate-700 cursor-not-allowed'
                                    : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700 hover:border-slate-600'
                                }`}
                            >
                                <MusicIcon /> MIDI
                            </button>
                            
                            <button
                                onClick={handleDownloadWav}
                                disabled={!pattern || isExportingWav}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold border transition-all ${
                                    !pattern
                                    ? 'border-slate-800 text-slate-700 cursor-not-allowed'
                                    : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700 hover:border-slate-600'
                                }`}
                            >
                                {isExportingWav ? (
                                    <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"></span>
                                ) : (
                                    <AudioWaveIcon />
                                )}
                                WAV
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}

export default App;