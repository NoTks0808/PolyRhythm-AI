import React, { useState, useEffect, useRef } from 'react';
import { TIME_SIGNATURE_OPTIONS, TRANSLATIONS, STYLE_PRESETS, MODEL_OPTIONS, Language } from './constants';
import { GeneratedPattern, DrumInstrument, DrumKit } from './types';
import { generateDrumPattern } from './services/geminiService';
import { audioEngine } from './services/audioEngine';
import { generateMidiBlob } from './services/midiService';
import Visualizer from './components/Visualizer';

// --- Icons ---
const PlayIcon = () => <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>;
const StopIcon = () => <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>;
const SparklesIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/></svg>;
const DownloadIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>;
const GlobeIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;

function App() {
  // --- Global State ---
  const [lang, setLang] = useState<Language>('zh');
  const t = TRANSLATIONS[lang];

  // --- Rhythm & Audio State ---
  const [prompt, setPrompt] = useState('');
  const [timeSignature, setTimeSignature] = useState('11/8');
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customNum, setCustomNum] = useState('15');
  const [customDen, setCustomDen] = useState('16');
  
  const [bpm, setBpm] = useState(130);
  const [bars, setBars] = useState(2); 
  const [selectedKit, setSelectedKit] = useState<DrumKit>(DrumKit.ACOUSTIC);
  
  // ✨ 默认选中第一个模型 (Gemini 3 Pro)
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].value); 
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [pattern, setPattern] = useState<GeneratedPattern | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  // --- Refs ---
  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const patternRef = useRef<GeneratedPattern | null>(null);

  // --- Effects ---
  useEffect(() => { patternRef.current = pattern; }, [pattern]);
  useEffect(() => { audioEngine.setKit(selectedKit); }, [selectedKit]);

  // --- Audio Scheduler ---
  const scheduleNote = (stepNumber: number, time: number, currentPattern: GeneratedPattern) => {
    currentPattern.notes.forEach(note => {
      if (note.step === stepNumber) {
        audioEngine.trigger(note.instrument, time, note.velocity);
      }
    });
  };

  const scheduler = () => {
    const lookahead = 25.0; 
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

  // --- Visualizer Loop ---
  useEffect(() => {
    let animationFrameId: number;
    const renderLoop = () => {
        if (isPlaying) {
            setCurrentStep(currentStepRef.current);
        } else {
            setCurrentStep(-1);
        }
        animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  // --- Handlers ---
  const handlePlay = async () => {
    if (!pattern) return;
    if (isPlaying) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
      return;
    }
    try {
        await audioEngine.init();
        setIsPlaying(true);
        isPlayingRef.current = true;
        currentStepRef.current = 0;
        nextNoteTimeRef.current = audioEngine.getCurrentTime() + 0.1;
        scheduler();
    } catch (e: any) {
        console.error("Audio Init Error:", e);
        setError(`Audio Error: ${e.message || 'Unknown'}`);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError(t.errPrompt); return; }
    setIsGenerating(true);
    setError(null);
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
    
    let finalSig = isCustomTime ? `${customNum}/${customDen}` : timeSignature;

    try {
      try { await audioEngine.init(); } catch (e) { console.warn(e); }

      const data = await generateDrumPattern({ 
          prompt, 
          timeSignature: finalSig, 
          bpm, 
          bars,
          model: selectedModel // ✨ 传入选择的模型
      });
      setPattern(data);
    } catch (err: any) {
      console.error("Generation Error:", err);
      // 优化错误提示：提示用户切换模型
      if (err.message && err.message.includes('Rate Limit')) {
         setError("当前模型额度已满，请在上方下拉菜单切换其他模型重试！");
      } else {
         setError(err.message || t.errLoad); 
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (type: 'midi' | 'wav') => {
      if (!pattern) return;
      if (type === 'midi') {
          const blob = generateMidiBlob(pattern);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `polyrhythm_${Date.now()}.mid`;
          a.click();
          URL.revokeObjectURL(url);
      } else {
          const blob = await audioEngine.exportWav(pattern);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `polyrhythm_${Date.now()}.wav`;
          a.click();
          URL.revokeObjectURL(url);
      }
  };

  // --- Input Helpers ---
  const handleBpmInput = (val: string) => {
      let v = parseInt(val);
      if (isNaN(v)) return;
      if (v < 40) v = 40;
      if (v > 300) v = 300;
      setBpm(v);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
      
      {/* Navbar */}
      <nav className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 3v18M3 10l18-4M3 18l18-4"/></svg>
            </div>
            <div>
                <h1 className="text-lg font-bold text-white tracking-tight leading-none">{t.title}</h1>
                <p className="text-[10px] text-slate-400 font-mono tracking-wider">{t.subtitle}</p>
            </div>
        </div>
        <button 
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white hover:border-cyan-500 transition-colors"
        >
            <GlobeIcon /> {lang === 'zh' ? 'EN' : '中文'}
        </button>
      </nav>

      {/* Main Layout */}
      <div className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar: Controls */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Rhythm Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                    {t.sectionRhythm}
                </h2>

                <div className="space-y-5">
                    {/* Time Signature */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-medium text-slate-400">{t.timeSig}</label>
                            <button 
                                onClick={() => setIsCustomTime(!isCustomTime)}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                                {isCustomTime ? t.presets : t.custom}
                            </button>
                        </div>
                        
                        {!isCustomTime ? (
                            <div className="grid grid-cols-4 gap-2">
                                {TIME_SIGNATURE_OPTIONS.map(ts => (
                                    <button
                                        key={ts}
                                        onClick={() => setTimeSignature(ts)}
                                        className={`h-8 text-xs font-bold rounded border transition-all ${
                                            timeSignature === ts 
                                            ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/20' 
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        {ts}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded border border-slate-700">
                                <input type="number" value={customNum} onChange={e => setCustomNum(e.target.value)} className="w-full bg-transparent text-center text-sm font-bold outline-none" placeholder={t.numerator} />
                                <span className="text-slate-500">/</span>
                                <select value={customDen} onChange={e => setCustomDen(e.target.value)} className="w-full bg-transparent text-center text-sm font-bold outline-none appearance-none">
                                    <option value="4">4</option><option value="8">8</option><option value="16">16</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* BPM Control */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-medium text-slate-400">{t.tempo}</label>
                            <span className="text-xs font-mono text-cyan-400">{bpm}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setBpm(b => Math.max(40, b - 1))} className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-lg">-</button>
                            <input 
                                type="range" min="40" max="240" value={bpm} 
                                onChange={e => setBpm(Number(e.target.value))}
                                className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                            <button onClick={() => setBpm(b => Math.min(240, b + 1))} className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-lg">+</button>
                            <input 
                                type="number" value={bpm} onChange={e => handleBpmInput(e.target.value)}
                                className="w-14 h-8 bg-slate-800 border border-slate-700 rounded text-center text-sm font-bold outline-none focus:border-cyan-500"
                            />
                        </div>
                    </div>

                    {/* Bars */}
                    <div>
                        <label className="text-xs font-medium text-slate-400 mb-2 block">{t.bars}</label>
                        <div className="flex bg-slate-800 p-1 rounded-lg">
                            {[1, 2, 4].map(b => (
                                <button
                                    key={b}
                                    onClick={() => setBars(b)}
                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${
                                        bars === b ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    {b}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sound & Style Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 backdrop-blur-sm flex-1 flex flex-col">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    {t.sectionSound}
                </h2>

                <div className="space-y-5 flex-1">
                    {/* ✨ Model Selector (New) */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">{t.modelLabel}</label>
                        <select 
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-bold text-slate-300 outline-none focus:border-purple-500 transition-all hover:border-purple-500/50 cursor-pointer"
                        >
                            {MODEL_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-slate-900">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Kit Selector */}
                    <div className="grid grid-cols-3 gap-2">
                        {Object.values(DrumKit).map(kit => (
                            <button
                                key={kit}
                                onClick={() => setSelectedKit(kit)}
                                className={`py-2 text-[10px] font-bold rounded border transition-all ${
                                    selectedKit === kit
                                    ? 'bg-slate-800 border-purple-500/50 text-purple-400'
                                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                                }`}
                            >
                                {kit === 'ACOUSTIC' ? t.kitAcoustic.split(' ')[0] : (kit === 'ELECTRONIC' ? t.kitElectronic.split(' ')[0] : t.kitIndustrial.split(' ')[0])}
                            </button>
                        ))}
                    </div>

                    {/* Style Presets */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">{t.styleLabel}</label>
                        <div className="flex flex-wrap gap-2">
                            {STYLE_PRESETS[lang].map((style) => (
                                <button
                                    key={style.id}
                                    onClick={() => setPrompt(style.text)}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-[10px] text-slate-300 transition-colors"
                                >
                                    {style.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Prompt Input */}
                    <div className="flex-1 flex flex-col">
                        <label className="text-xs font-medium text-slate-400 mb-2">{t.promptLabel}</label>
                        <textarea 
                            className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none transition-all"
                            placeholder={t.promptPlaceholder}
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                        />
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
                            isGenerating
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/20'
                        }`}
                    >
                        {isGenerating ? (
                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> {t.generating}</>
                        ) : (
                            <><SparklesIcon /> {t.generate}</>
                        )}
                    </button>
                    {error && <p className="text-xs text-red-400 text-center bg-red-900/20 p-2 rounded animate-pulse">{error}</p>}
                </div>
            </div>
        </aside>

        {/* Right Content: Visualizer & Playback */}
        <main className="lg:col-span-8 flex flex-col gap-6 h-[calc(100vh-8rem)] min-h-[600px]">
            
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950/30">
                    <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${pattern ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></span>
                        <span className="text-xs font-mono font-bold text-slate-400 tracking-wider">
                            {pattern ? pattern.timeSignature : '--/--'} • {pattern ? `${pattern.totalSteps} STEPS` : 'NO DATA'}
                        </span>
                    </div>
                    {pattern && (
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[300px]">
                            {pattern.description}
                        </div>
                    )}
                </div>

                {/* Vis Area */}
                <div className="flex-1 relative bg-slate-950 p-4">
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:2rem_2rem]"></div>
                    <div className="relative h-full w-full border border-slate-800/50 rounded-lg overflow-hidden bg-slate-900/50 backdrop-blur-sm">
                        <Visualizer pattern={pattern} isPlaying={isPlaying} currentStepRef={currentStepRef} />
                    </div>
                </div>

                {/* Playback Controls (Bottom Bar) */}
                <div className="h-20 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePlay}
                            disabled={!pattern}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                !pattern ? 'bg-slate-800 text-slate-600' :
                                isPlaying 
                                ? 'bg-red-500 text-white hover:bg-red-400 shadow-lg shadow-red-500/20' 
                                : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                            }`}
                        >
                            {isPlaying ? <StopIcon /> : <PlayIcon />}
                        </button>
                        <div>
                            <div className="text-xs font-bold text-white mb-0.5">{isPlaying ? t.statusPlay : (pattern ? t.statusReady : "...")}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{pattern ? `${bpm} BPM` : ""}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => handleDownload('midi')} disabled={!pattern}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-50 transition-all"
                        >
                            <DownloadIcon /> MIDI
                        </button>
                        <button 
                            onClick={() => handleDownload('wav')} disabled={!pattern}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-50 transition-all"
                        >
                            <DownloadIcon /> WAV
                        </button>
                    </div>
                </div>
            </div>
        </main>

      </div>
    </div>
  );
}

export default App;