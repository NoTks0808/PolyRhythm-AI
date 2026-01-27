import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TIME_SIGNATURE_OPTIONS, TRANSLATIONS, STYLE_PRESETS, MODEL_OPTIONS, Language } from './constants';
import { GeneratedPattern, DrumInstrument, DrumKit } from './types';
import { generateDrumPattern } from './services/geminiService';
import { audioEngine } from './services/audioEngine';
import { generateMidiBlob } from './services/midiService';
import Visualizer from './components/Visualizer';
import { usePatternEditor, ensureNoteIds } from './hooks/usePatternEditor';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Icons
const PlayIcon = () => <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>;
const StopIcon = () => <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>;
const SparklesIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z" /></svg>;
const DownloadIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>;
const GlobeIcon = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
const KeyIcon = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>;
const HelpIcon = () => <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>;

function App() {
    const [lang, setLang] = useState<Language>('zh');
    const t = TRANSLATIONS[lang];

    const [prompt, setPrompt] = useState('');
    const [timeSignature, setTimeSignature] = useState('11/8');
    const [isCustomTime, setIsCustomTime] = useState(false);
    const [customNum, setCustomNum] = useState('15');
    const [customDen, setCustomDen] = useState('16');

    const [bpm, setBpm] = useState(130);
    const [bars, setBars] = useState(2);
    const [selectedKit, setSelectedKit] = useState<DrumKit>(DrumKit.ACOUSTIC);
    const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].value);

    // Key 相关状态
    const [userApiKey, setUserApiKey] = useState('');
    const [showKeyInput, setShowKeyInput] = useState(false);
    const [showGuide, setShowGuide] = useState(false); // ✨ 教程弹窗开关

    const [isGenerating, setIsGenerating] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(-1);
    const [error, setError] = useState<string | null>(null);

    // ✨ 使用 Pattern Editor Hook (带撤销/重做)
    const {
        pattern,
        selectedNoteIds,
        setPattern,
        addNote,
        deleteNote,
        updateNoteVelocity,
        moveNote,
        selectNote,
        clearSelection,
        deleteSelected,
        undo,
        redo,
        canUndo,
        canRedo,
    } = usePatternEditor(null);

    const nextNoteTimeRef = useRef(0);
    const currentStepRef = useRef(0);
    const timerIDRef = useRef<number | null>(null);
    const isPlayingRef = useRef(false);
    const patternRef = useRef<GeneratedPattern | null>(null);

    useEffect(() => { patternRef.current = pattern; }, [pattern]);
    useEffect(() => { audioEngine.setKit(selectedKit); }, [selectedKit]);

    // 全局静默解锁
    useEffect(() => {
        const unlockAudio = () => {
            audioEngine.init();
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        };
        document.addEventListener('click', unlockAudio);
        document.addEventListener('keydown', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);
        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        };
    }, []);

    useEffect(() => {
        const savedKey = localStorage.getItem('GEMINI_USER_KEY');
        if (savedKey) {
            setUserApiKey(savedKey);
            setShowKeyInput(true);
        }
    }, []);

    const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setUserApiKey(val);
        localStorage.setItem('GEMINI_USER_KEY', val);
    };

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

    // ✨ 键盘快捷键 (Ctrl+Z, Delete, Space) - 必须在 handlePlay 之后调用
    useKeyboardShortcuts({
        onUndo: undo,
        onRedo: redo,
        onDelete: deleteSelected,
        onTogglePlay: handlePlay,
        canUndo,
        canRedo,
    });

    const handleGenerate = async () => {
        if (!prompt.trim()) { setError(t.errPrompt); return; }
        setIsGenerating(true);
        setError(null);
        setIsPlaying(false);
        isPlayingRef.current = false;
        if (timerIDRef.current) window.clearTimeout(timerIDRef.current);

        let finalSig = isCustomTime ? `${customNum}/${customDen}` : timeSignature;

        try {
            try { audioEngine.init(); } catch (e) { console.warn(e); }

            const data = await generateDrumPattern({
                prompt,
                timeSignature: finalSig,
                bpm,
                bars,
                model: selectedModel,
                apiKey: userApiKey
            });
            setPattern(data);
        } catch (err: any) {
            console.error("Generation Error:", err);
            if (err.message && (err.message.includes('429') || err.message.includes('Key'))) {
                setShowKeyInput(true);
            }
            setError(err.message || t.errLoad);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async (type: 'midi' | 'wav') => {
        if (!pattern) return;
        if (type === 'midi') {
            const generateMidiBlob = (await import('./services/midiService')).generateMidiBlob; // Lazy load
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

    const handleBpmInput = (val: string) => {
        // 允许用户输入任意数字，不做立即限制
        const v = parseInt(val);
        if (isNaN(v)) return;
        setBpm(v);  // 直接设置，不限制范围
    };

    const handleBpmBlur = () => {
        // 失焦时才进行范围验证
        if (bpm < 40) setBpm(40);
        if (bpm > 240) setBpm(240);
    };

    return (
        <div className="min-h-screen text-[var(--text-primary)] font-sans selection:bg-[var(--accent-primary)] selection:text-[var(--bg-deep)] grid-bg">

            {/* 教程弹窗 (Modal) */}
            {showGuide && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] glow-border rounded-xl max-w-md w-full p-6 shadow-2xl relative">
                        <button
                            onClick={() => setShowGuide(false)}
                            className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-bold gradient-text font-display mb-4 flex items-center gap-2">
                            <KeyIcon /> {t.guideTitle}
                        </h3>
                        <div className="space-y-3 mb-6">
                            {t.guideSteps.map((step, i) => (
                                <div key={i} className="text-sm text-[var(--text-primary)] flex gap-3">
                                    <span className="text-xs font-mono text-[var(--accent-primary)] mt-0.5">{step.split('.')[0]}.</span>
                                    <span className="text-slate-300">{step.split('.').slice(1).join('.')}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end">
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--bg-deep)] text-xs font-bold rounded-lg hover-lift transition-all mr-3 flex items-center gap-2"
                            >
                                前往 Google AI Studio 🚀
                            </a>
                            <button
                                onClick={() => setShowGuide(false)}
                                className="px-4 py-2 bg-white/5 text-[var(--text-muted)] hover:text-white text-xs font-bold rounded-lg hover:bg-white/10 transition-all"
                            >
                                {t.close}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Navbar */}
            <nav className="h-16 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50 glow-border mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] shadow-[0_0_15px_var(--glow-primary)] flex items-center justify-center text-[var(--bg-deep)]">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 3v18M3 10l18-4M3 18l18-4" /></svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight leading-none font-display gradient-text">{t.title}</h1>
                        <p className="text-[10px] text-[var(--text-muted)] font-mono tracking-wider">{t.subtitle}</p>
                    </div>
                </div>
                <button
                    onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-primary)] transition-all"
                >
                    <GlobeIcon /> {lang === 'zh' ? 'EN' : '中文'}
                </button>
            </nav>

            {/* Main Layout */}
            <div className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Sidebar: Controls */}
                <aside className="lg:col-span-4 flex flex-col gap-6">

                    {/* Rhythm Card */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 backdrop-blur-sm glow-border relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)] opacity-[0.03] blur-3xl rounded-full translate-x-10 -translate-y-10"></div>

                        <h2 className="text-xs font-bold text-[var(--accent-primary)] uppercase tracking-widest mb-6 flex items-center gap-2 font-display">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-primary)]"></span>
                            {t.sectionRhythm}
                        </h2>

                        <div className="space-y-6">
                            {/* Time Signature */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{t.timeSig}</label>
                                    <button
                                        onClick={() => setIsCustomTime(!isCustomTime)}
                                        className="text-[10px] text-[var(--accent-primary)] hover:text-white transition-colors"
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
                                                className={`h-9 text-xs font-bold rounded border transition-all hover-lift ${timeSignature === ts
                                                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--bg-deep)] shadow-[0_0_15px_var(--glow-primary)]'
                                                    : 'bg-white/5 border-transparent text-[var(--text-muted)] hover:bg-white/10 hover:text-white'
                                                    }`}
                                            >
                                                {ts}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 bg-black/20 p-2 rounded border border-[var(--border-subtle)] focus-within:border-[var(--accent-primary)] transition-colors">
                                        <input type="number" value={customNum} onChange={e => setCustomNum(e.target.value)} className="w-full bg-transparent text-center text-sm font-bold outline-none text-white" placeholder={t.numerator} />
                                        <span className="text-[var(--text-muted)]">/</span>
                                        <select value={customDen} onChange={e => setCustomDen(e.target.value)} className="w-full bg-transparent text-center text-sm font-bold outline-none appearance-none text-[var(--accent-primary)] cursor-pointer">
                                            <option value="4" className="bg-[var(--bg-deep)]">4</option>
                                            <option value="8" className="bg-[var(--bg-deep)]">8</option>
                                            <option value="16" className="bg-[var(--bg-deep)]">16</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* BPM Control */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{t.tempo}</label>
                                    <span className="text-xs font-mono text-[var(--accent-primary)] font-bold">{bpm}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setBpm(b => Math.max(40, b - 1))} className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white text-lg transition-colors border border-transparent hover:border-[var(--border-subtle)]">-</button>
                                    <input
                                        type="range" min="40" max="240" value={bpm}
                                        onChange={e => setBpm(Number(e.target.value))}
                                        className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <button onClick={() => setBpm(b => Math.min(240, b + 1))} className="w-8 h-8 rounded bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white text-lg transition-colors border border-transparent hover:border-[var(--border-subtle)]">+</button>
                                    <input
                                        type="number" value={bpm}
                                        onChange={e => handleBpmInput(e.target.value)}
                                        onBlur={handleBpmBlur}
                                        className="w-14 h-8 bg-black/20 border border-[var(--border-subtle)] rounded text-center text-sm font-bold outline-none focus:border-[var(--accent-primary)] text-[var(--accent-primary)] transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Bars */}
                            <div>
                                <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3 block">{t.bars}</label>
                                <div className="flex bg-black/20 p-1 rounded-lg border border-[var(--border-subtle)]">
                                    {[1, 2, 4].map(b => (
                                        <button
                                            key={b}
                                            onClick={() => setBars(b)}
                                            className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-all ${bars === b ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-subtle)]' : 'text-[var(--text-muted)] hover:text-white'
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
                    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 backdrop-blur-sm glow-border flex-1 flex flex-col relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[var(--accent-secondary)] opacity-[0.03] blur-3xl -translate-x-10 translate-y-10"></div>

                        <h2 className="text-xs font-bold text-[var(--accent-secondary)] uppercase tracking-widest mb-6 flex items-center gap-2 font-display">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-secondary)] shadow-[0_0_10px_var(--accent-secondary)]"></span>
                            {t.sectionSound}
                        </h2>

                        <div className="space-y-6 flex-1">
                            {/* Model Selector & API Key */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase flex justify-between items-center tracking-wider">
                                    {t.modelLabel}
                                    <button
                                        onClick={() => setShowKeyInput(!showKeyInput)}
                                        className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-white transition-colors"
                                    >
                                        <KeyIcon /> {showKeyInput ? (lang === 'zh' ? "隐藏 Key" : "Hide Key") : (lang === 'zh' ? "自定义 Key" : "Custom Key")}
                                    </button>
                                </label>

                                <div className="relative">
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="w-full bg-white/5 border border-[var(--border-subtle)] rounded-lg p-3 text-xs font-bold text-slate-200 outline-none focus:border-[var(--accent-secondary)] transition-all hover:bg-white/10 cursor-pointer appearance-none"
                                    >
                                        {MODEL_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value} className="bg-[var(--bg-deep)]">
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-3 pointer-events-none text-[var(--text-muted)]">▼</div>
                                </div>

                                {/* ✨ API Key 输入框 */}
                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showKeyInput ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="flex flex-col gap-1">
                                        <input
                                            type="password"
                                            placeholder={lang === 'zh' ? "输入你的 Gemini API Key" : "Enter Gemini API Key"}
                                            value={userApiKey}
                                            onChange={handleKeyChange}
                                            className="w-full bg-black/20 border border-[var(--border-subtle)] rounded-lg p-2 text-xs text-[var(--accent-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] outline-none"
                                        />
                                        <button
                                            onClick={() => setShowGuide(true)}
                                            className="self-start flex items-center gap-1 text-[9px] text-[var(--accent-secondary)] hover:text-white transition-colors mt-0.5"
                                        >
                                            <HelpIcon /> {t.howToGetKey}
                                        </button>
                                        <p className="text-[9px] text-[var(--text-muted)] mt-1 pl-1 border-t border-[var(--border-subtle)] pt-1">
                                            {lang === 'zh' ? "* 你的 Key 仅存储在本地浏览器，不会上传" : "* Your key is stored locally and never uploaded"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Kit Selector */}
                            <div className="grid grid-cols-3 gap-2">
                                {Object.values(DrumKit).map(kit => (
                                    <button
                                        key={kit}
                                        onClick={() => setSelectedKit(kit)}
                                        className={`py-3 text-[10px] font-bold rounded border transition-all hover-lift ${selectedKit === kit
                                            ? 'bg-[var(--bg-deep)] border-[var(--accent-secondary)] text-[var(--accent-secondary)] shadow-[0_0_10px_rgba(124,58,237,0.2)]'
                                            : 'bg-white/5 border-transparent text-[var(--text-muted)] hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        {kit === 'ACOUSTIC' ? t.kitAcoustic.split(' ')[0] : (kit === 'ELECTRONIC' ? t.kitElectronic.split(' ')[0] : t.kitIndustrial.split(' ')[0])}
                                    </button>
                                ))}
                            </div>

                            {/* Style Presets */}
                            <div>
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-3 block tracking-wider">{t.styleLabel}</label>
                                <div className="flex flex-wrap gap-2">
                                    {STYLE_PRESETS[lang].map((style) => (
                                        <button
                                            key={style.id}
                                            onClick={() => setPrompt(style.text)}
                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-transparent hover:border-[var(--border-subtle)] rounded-full text-[10px] text-[var(--text-muted)] hover:text-white transition-all"
                                        >
                                            {style.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Prompt Input */}
                            <div className="flex-1 flex flex-col">
                                <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">{t.promptLabel}</label>
                                <textarea
                                    className="flex-1 w-full bg-black/20 border border-[var(--border-subtle)] rounded-lg p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none resize-none transition-all"
                                    placeholder={t.promptPlaceholder}
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                />
                            </div>

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] font-display hover-lift ${isGenerating
                                    ? 'bg-white/5 text-[var(--text-muted)] cursor-not-allowed'
                                    : 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-[var(--bg-deep)] shadow-[0_0_20px_var(--glow-primary)]'
                                    }`}
                            >
                                {isGenerating ? (
                                    <><span className="w-4 h-4 border-2 border-[var(--bg-deep)]/30 border-t-[var(--bg-deep)] rounded-full animate-spin" /> {t.generating}</>
                                ) : (
                                    <><SparklesIcon /> {t.generate}</>
                                )}
                            </button>
                            {error && <p className="text-xs text-red-400 text-center bg-red-900/20 p-2 rounded animate-pulse border border-red-500/20">{error}</p>}
                        </div>
                    </div>
                </aside>

                {/* Right Content: Visualizer & Playback */}
                <main className="lg:col-span-8 flex flex-col gap-6 h-[calc(100vh-8rem)] min-h-[600px]">

                    <div className="flex-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl relative overflow-hidden flex flex-col shadow-2xl glow-border">
                        {/* Header */}
                        <div className="h-12 border-b border-[var(--border-subtle)] flex items-center justify-between px-4 bg-white/5">
                            <div className="flex items-center gap-3">
                                <span className={`w-2 h-2 rounded-full ${pattern ? 'bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)] animate-pulse' : 'bg-[var(--text-muted)]'}`}></span>
                                <span className="text-xs font-mono font-bold text-[var(--accent-primary)] tracking-wider">
                                    {pattern ? pattern.timeSignature : '--/--'} • {pattern ? `${pattern.totalSteps} STEPS` : 'NO DATA'}
                                </span>
                            </div>
                            {pattern && (
                                <div className="text-[10px] text-[var(--text-muted)] font-mono truncate max-w-[300px]">
                                    {pattern.description}
                                </div>
                            )}
                        </div>

                        {/* Vis Area */}
                        <div className="flex-1 relative bg-[var(--bg-deep)] p-4 overflow-hidden">
                            <div className="absolute inset-0 grid-bg opacity-50"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[var(--accent-primary)] opacity-[0.02] blur-[100px] rounded-full"></div>

                            <div className="relative h-full w-full border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-black/40 backdrop-blur-sm shadow-inner">
                                <Visualizer
                                    pattern={pattern}
                                    isPlaying={isPlaying}
                                    currentStepRef={currentStepRef}
                                    editable={true}
                                    selectedNoteIds={selectedNoteIds}
                                    onNoteAdd={addNote}
                                    onNoteDelete={deleteNote}
                                    onNoteVelocityChange={updateNoteVelocity}
                                    onNoteMove={moveNote}
                                    onNoteSelect={selectNote}
                                    onClearSelection={clearSelection}
                                />
                            </div>
                        </div>

                        {/* Playback Controls (Bottom Bar) */}
                        <div className="h-24 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] backdrop-blur-md flex items-center justify-between px-8">
                            <div className="flex items-center gap-6">
                                <button
                                    onClick={handlePlay}
                                    disabled={!pattern}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover-lift ${!pattern ? 'bg-white/5 text-[var(--text-muted)] cursor-not-allowed' :
                                        isPlaying
                                            ? 'bg-[var(--accent-warm)] text-[var(--bg-deep)] shadow-[0_0_20px_var(--accent-warm)]'
                                            : 'bg-[var(--accent-primary)] text-[var(--bg-deep)] shadow-[0_0_20px_var(--accent-primary)]'
                                        }`}
                                >
                                    {isPlaying ? <StopIcon /> : <PlayIcon />}
                                </button>
                                <div>
                                    <div className="text-sm font-bold text-white mb-0.5 font-display flex items-center gap-2">
                                        {isPlaying ? t.statusPlay : (pattern ? t.statusReady : "...")}
                                        {isPlaying && <span className="flex gap-0.5 items-end h-3"><span className="w-0.5 h-full bg-[var(--accent-primary)] wave-bar" style={{ "--i": 0 } as any}></span><span className="w-0.5 h-full bg-[var(--accent-primary)] wave-bar" style={{ "--i": 1 } as any}></span><span className="w-0.5 h-full bg-[var(--accent-primary)] wave-bar" style={{ "--i": 2 } as any}></span></span>}
                                    </div>
                                    <div className="text-[10px] text-[var(--text-muted)] font-mono border border-[var(--border-subtle)] px-2 py-0.5 rounded-full inline-block mt-1">{pattern ? `${bpm} BPM` : "READY"}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleDownload('midi')} disabled={!pattern}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 disabled:opacity-50 transition-all"
                                >
                                    <DownloadIcon /> MIDI
                                </button>
                                <button
                                    onClick={() => handleDownload('wav')} disabled={!pattern}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/10 disabled:opacity-50 transition-all"
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