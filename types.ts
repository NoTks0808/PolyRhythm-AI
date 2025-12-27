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
  instrument: DrumInstrument;
  step: number;
  velocity: number;
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