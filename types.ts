// 乐器枚举：定义了我们支持哪些鼓部件
export enum DrumInstrument {
  KICK = 'KICK',
  SNARE = 'SNARE',
  HIHAT_CLOSED = 'HIHAT_CLOSED',
  HIHAT_OPEN = 'HIHAT_OPEN',
  TOM_LOW = 'TOM_LOW',
  TOM_HIGH = 'TOM_HIGH',
  CRASH = 'CRASH',
  RIDE = 'RIDE'
}

// 鼓组风格枚举：决定了 AudioEngine 加载什么音色/效果器
export enum DrumKit {
  ACOUSTIC = 'ACOUSTIC',   // 原声
  ELECTRONIC = 'ELECTRONIC', // 电子/合成器
  INDUSTRIAL = 'INDUSTRIAL'  // 工业/失真
}

// 单个音符的结构
export interface DrumNote {
  instrument: DrumInstrument;
  step: number;    // 时间网格位置 (0, 1, 2...)
  velocity: number; // 力度 (0.0 - 1.0)
}

// AI 生成的完整模式结构
export interface GeneratedPattern {
  bpm: number;
  timeSignature: string; // e.g. "7/8" 或 "15/16"
  subdivisionsPerBeat: number; // 通常为 4 (16分音符)
  totalSteps: number;    // 总步数 (严格数学计算得出)
  bars: number;          // 小节数
  notes: DrumNote[];     // 音符列表
  description: string;   // AI 对这段节奏的文字描述
}

// 前端传给后端的参数
export interface GenerationParams {
  prompt: string;
  timeSignature: string;
  bpm: number;
  bars: number;
}