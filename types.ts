export enum DrumInstrument {
  KICK = 'KICK',
  SNARE = 'SNARE',
  HIHAT_CLOSED = 'HIHAT_CLOSED',
  HIHAT_OPEN = 'HIHAT_OPEN',
  TOM_LOW = 'TOM_LOW',
  TOM_HIGH = 'TOM_HIGH',
  CRASH = 'CRASH',
  RIDE = 'RIDE',
}

export enum DrumKit {
  ACOUSTIC = 'ACOUSTIC',
  ELECTRONIC = 'ELECTRONIC',
  INDUSTRIAL = 'INDUSTRIAL',
}

export interface DrumNote {
  id: string;  // 唯一标识符，用于编辑追踪
  instrument: DrumInstrument;
  step: number;  // 音符起始位置（以32分音符为单位）
  velocity: number;  // 力度 (0.0-1.0)
  duration: number;  // 音符持续时长（以32分音符为单位，默认2=16分音符）
}

export interface GeneratedPattern {
  description: string;
  bpm: number;
  timeSignature: string;
  subdivisionsPerBeat: number;
  totalSteps: number;
  bars: number;
  notes: DrumNote[];
}

// ✨ 核心修改：增加了 model 字段
export interface GenerationParams {
  prompt: string;
  timeSignature: string;
  bpm: number;
  bars: number;
  model: string;
}

// ... 其他保持不变 ...

export interface GenerationParams {
  prompt: string;
  timeSignature: string;
  bpm: number;
  bars: number;
  model: string;
  apiKey?: string; // ✨ 新增：支持传入自定义 Key
}