import { DrumInstrument } from './types';

// General MIDI Mapping for Drums (Channel 10)
// Math Rock 常用打击乐器的 MIDI 映射
export const MIDI_MAP: Record<DrumInstrument, number> = {
  [DrumInstrument.KICK]: 36, // Bass Drum 1
  [DrumInstrument.SNARE]: 38, // Acoustic Snare
  [DrumInstrument.HIHAT_CLOSED]: 42, // Closed Hi-Hat
  [DrumInstrument.HIHAT_OPEN]: 46, // Open Hi-Hat
  [DrumInstrument.TOM_LOW]: 43, // Low Floor Tom
  [DrumInstrument.TOM_HIGH]: 50, // High Tom
  [DrumInstrument.CRASH]: 49, // Crash Cymbal 1
  [DrumInstrument.RIDE]: 51, // Ride Cymbal 1
};

// 预设拍号列表
// 这些是 Math Rock 中最经典的“不规则拍子”，点击按钮直接调用
export const TIME_SIGNATURE_OPTIONS = [
  "4/4", "3/4", 
  "5/4", "7/4", 
  "5/8", "7/8", "9/8", "11/8", "13/8"
];

// 灵感提示词库
export const SUGGESTED_PROMPTS = [
  "Melancholic math rock with ghost notes",
  "Aggressive driving energetic breakdown",
  "Complex syncopated jazz-fusion feel",
  "Sad, slow, spacious build-up",
  "Chaotic panic chord style drumming"
];