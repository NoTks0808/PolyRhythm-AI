import { DrumInstrument } from './types';

// MIDI 映射表 (保持不变)
export const MIDI_MAP: Record<DrumInstrument, number> = {
  [DrumInstrument.KICK]: 36,
  [DrumInstrument.SNARE]: 38,
  [DrumInstrument.HIHAT_CLOSED]: 42,
  [DrumInstrument.HIHAT_OPEN]: 46,
  [DrumInstrument.TOM_LOW]: 43,
  [DrumInstrument.TOM_HIGH]: 50,
  [DrumInstrument.CRASH]: 49,
  [DrumInstrument.RIDE]: 51,
};

// 拍号选项
export const TIME_SIGNATURE_OPTIONS = [
  "4/4", "3/4", "5/4", "7/4", 
  "5/8", "7/8", "9/8", "11/8", "13/8"
];

// --- 多语言系统 ---

export type Language = 'zh' | 'en';

export const TRANSLATIONS = {
  zh: {
    title: "PolyRhythm AI",
    subtitle: "生成式数学摇滚鼓机",
    sectionRhythm: "基础律动 (Rhythm)",
    sectionSound: "音色与风格 (Sound & Style)",
    timeSig: "拍号",
    custom: "自定义",
    presets: "预设",
    numerator: "分子",
    denominator: "分母",
    bars: "小节数",
    tempo: "速度 (BPM)",
    kit: "鼓组音色",
    kitAcoustic: "原声鼓 (Acoustic)",
    kitElectronic: "电子鼓 (Electronic)",
    kitIndustrial: "工业 (Industrial)",
    promptLabel: "AI 描述词",
    promptPlaceholder: "描述你想要的节奏...",
    styleLabel: "快速风格:",
    generate: "生成节奏",
    generating: "AI 作曲中...",
    playing: "停止播放",
    preview: "试听节奏",
    exportMidi: "下载 MIDI",
    exportWav: "下载 WAV",
    statusReady: "就绪",
    statusGen: "生成中",
    statusPlay: "播放中",
    errPrompt: "请先输入描述词或选择一个风格",
    errLoad: "音频引擎加载失败",
    currentPattern: "当前模式",
    aiAnalysis: "AI 分析",
  },
  en: {
    title: "PolyRhythm AI",
    subtitle: "Generative Math Rock Sequencer",
    sectionRhythm: "Rhythm Base",
    sectionSound: "Sound & Style",
    timeSig: "Time Sig",
    custom: "Custom",
    presets: "Presets",
    numerator: "Num",
    denominator: "Den",
    bars: "Bars",
    tempo: "Tempo (BPM)",
    kit: "Drum Kit",
    kitAcoustic: "Acoustic",
    kitElectronic: "Electronic",
    kitIndustrial: "Industrial",
    promptLabel: "AI Prompt",
    promptPlaceholder: "Describe the groove...",
    styleLabel: "Quick Styles:",
    generate: "Generate",
    generating: "Composing...",
    playing: "Stop",
    preview: "Preview",
    exportMidi: "Save MIDI",
    exportWav: "Save WAV",
    statusReady: "Ready",
    statusGen: "Busy",
    statusPlay: "Playing",
    errPrompt: "Please enter a prompt first",
    errLoad: "Audio Engine Error",
    currentPattern: "Active Pattern",
    aiAnalysis: "AI Analysis",
  }
};

// --- 风格预设 (点击按钮自动填入) ---

export const STYLE_PRESETS = {
  zh: [
    { id: 'math', label: '🧮 数学摇滚', text: "复杂的 Math Rock 节奏，7/8 拍。底鼓和军鼓高度切分，使用大量的 Ghost Notes（幽灵音）填充空隙。镲片要清脆、开放。类似 American Football 或 TTNG 的风格。" },
    { id: 'post', label: '🌌 后摇滚', text: "史诗感的 Post-Rock 构建（Build-up）。从稀疏的军鼓滚奏开始，逐渐加强力度。大量使用 Ride 镲的钟帽（Bell）进行重音点缀。氛围宏大，像 Mogwai。" },
    { id: 'djent', label: '🔨 数字金属', text: "极度机械、冰冷的 Djent 金属节奏。底鼓要像机枪一样精准，与军鼓形成切分错位。使用多重节奏（Polyrhythm）感觉。音色干、重、有冲击力。" },
    { id: 'jazz', label: '🎷 爵士融合', text: "快速、摇摆的爵士融合节奏。重点在于 Ride 镲的摇摆律动（Swing）和军鼓的切分互动。底鼓轻盈即兴，充满切分音。类似 Snarky Puppy。" },
    { id: 'glitch', label: '👾 故障电子', text: "混乱但有逻辑的 IDM/Glitch 节奏。Aphex Twin 风格。极快的军鼓连打（Rush），不规则的底鼓模式，利用休止符制造'故障'感。" }
  ],
  en: [
    { id: 'math', label: '🧮 Math Rock', text: "Complex Math Rock groove in 7/8. Highly syncopated kick and snare interplay with extensive use of ghost notes. Clean, open hi-hats. Technical vibe like American Football." },
    { id: 'post', label: '🌌 Post-Rock', text: "Epic Post-Rock build-up. Starting with sparse snare rolls and gradually increasing velocity. Heavy use of Ride bell accents. Atmospheric like Mogwai." },
    { id: 'djent', label: '🔨 Djent', text: "Cold, mechanical Djent metal rhythm. Machine-gun like kick drums synchronized with off-beat snares. Heavy polyrhythmic feel. Dry, punchy sound." },
    { id: 'jazz', label: '🎷 Jazz Fusion', text: "Fast, syncopated Jazz Fusion groove. Swing feel on the Ride cymbal. Linear interaction with snare. Improvisational kick drum." },
    { id: 'glitch', label: '👾 Glitch/IDM', text: "Chaotic but logical IDM/Glitch beat. Aphex Twin style. Fast snare rushes, irregular kick patterns. Use silence for a 'stuttering' aesthetic." }
  ]
};