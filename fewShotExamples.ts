/**
 * Few-Shot 示例库
 * 存放从真实 MIDI 文件转换的鼓谱 JSON，用于提升 AI 生成质量
 * 
 * 使用方法：
 * 1. 用 midi-to-json-tool 转换 MIDI 文件
 * 2. 将生成的 JSON 添加到下方的 EXAMPLES 数组
 * 3. geminiService.ts 会自动使用这些示例
 */

import { GeneratedPattern, DrumInstrument } from './types';

// Few-Shot 示例类型 (使用宽松类型，因为这些会被序列化为 JSON 字符串传给 AI)
interface FewShotPattern {
    description: string;
    bpm: number;
    timeSignature: string;
    subdivisionsPerBeat: number;
    totalSteps: number;
    bars: number;
    notes: Array<{
        instrument: string;
        step: number;
        velocity: number;
    }>;
}

// Few-Shot 示例数组
export const FEW_SHOT_PATTERNS: FewShotPattern[] = [
    // ============================================
    // 示例 1：toe - 数摇 Math Rock
    // ============================================
    {
        "description": "日式数摇 Math Rock (toe风格): 以 Ride 镲片为主导的清新律动，大量使用 Ghost Notes 营造呼吸感，Kick 与 Snare 错位编排创造复杂节奏张力，整体氛围轻盈飘逸、情感细腻",
        "bpm": 141,
        "timeSignature": "4/4",
        "subdivisionsPerBeat": 4,
        "totalSteps": 128,
        "bars": 8,
        "notes": [
            { "instrument": "SNARE", "step": 0, "velocity": 0.5 },
            { "instrument": "KICK", "step": 1, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 1, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 2, "velocity": 0.8 },
            { "instrument": "KICK", "step": 4, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 4, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 6, "velocity": 0.8 },
            { "instrument": "KICK", "step": 7, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 8, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 8, "velocity": 0.8 },
            { "instrument": "KICK", "step": 9, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 10, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 11, "velocity": 0.5 },
            { "instrument": "RIDE", "step": 12, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 13, "velocity": 0.8 },
            { "instrument": "KICK", "step": 14, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 14, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 15, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 16, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 17, "velocity": 0.5 },
            { "instrument": "SNARE", "step": 19, "velocity": 0.5 },
            { "instrument": "SNARE", "step": 20, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 22, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 23, "velocity": 0.5 },
            { "instrument": "SNARE", "step": 24, "velocity": 0.5 },
            { "instrument": "SNARE", "step": 25, "velocity": 0.5 },
            { "instrument": "KICK", "step": 26, "velocity": 0.8 },
            { "instrument": "HIHAT_CLOSED", "step": 26, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 27, "velocity": 0.5 },
            { "instrument": "RIDE", "step": 28, "velocity": 0.8 },
            { "instrument": "KICK", "step": 29, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 30, "velocity": 0.8 },
            { "instrument": "KICK", "step": 32, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 32, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 33, "velocity": 0.5 },
            { "instrument": "SNARE", "step": 34, "velocity": 0.5 },
            { "instrument": "KICK", "step": 35, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 35, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 36, "velocity": 0.8 },
            { "instrument": "KICK", "step": 38, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 38, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 39, "velocity": 0.5 },
            { "instrument": "SNARE", "step": 42, "velocity": 1.0 },
            { "instrument": "SNARE", "step": 43, "velocity": 1.0 },
            { "instrument": "RIDE", "step": 44, "velocity": 1.0 },
            { "instrument": "SNARE", "step": 45, "velocity": 0.5 },
            { "instrument": "RIDE", "step": 46, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 47, "velocity": 0.5 },
            { "instrument": "KICK", "step": 48, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 48, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 49, "velocity": 0.5 },
            { "instrument": "SNARE", "step": 50, "velocity": 0.5 },
            { "instrument": "KICK", "step": 51, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 51, "velocity": 0.8 },
            { "instrument": "KICK", "step": 53, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 53, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 54, "velocity": 0.5 },
            { "instrument": "SNARE", "step": 55, "velocity": 0.5 },
            { "instrument": "KICK", "step": 56, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 56, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 57, "velocity": 0.5 },
            { "instrument": "RIDE", "step": 58, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 59, "velocity": 0.5 },
            { "instrument": "SNARE", "step": 61, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 62, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 63, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 64, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 65, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 66, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 67, "velocity": 0.8 },
            { "instrument": "KICK", "step": 68, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 68, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 70, "velocity": 0.8 },
            { "instrument": "KICK", "step": 72, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 72, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 73, "velocity": 0.5 },
            { "instrument": "RIDE", "step": 74, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 75, "velocity": 0.5 },
            { "instrument": "RIDE", "step": 76, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 77, "velocity": 0.5 },
            { "instrument": "KICK", "step": 78, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 78, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 79, "velocity": 0.5 },
            { "instrument": "KICK", "step": 80, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 80, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 81, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 82, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 83, "velocity": 0.8 },
            { "instrument": "KICK", "step": 84, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 84, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 85, "velocity": 0.5 },
            { "instrument": "SNARE", "step": 86, "velocity": 0.5 },
            { "instrument": "KICK", "step": 87, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 87, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 88, "velocity": 0.5 },
            { "instrument": "SNARE", "step": 89, "velocity": 0.5 },
            { "instrument": "KICK", "step": 90, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 90, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 92, "velocity": 0.8 },
            { "instrument": "KICK", "step": 94, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 94, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 95, "velocity": 0.5 },
            { "instrument": "KICK", "step": 96, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 96, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 97, "velocity": 0.5 },
            { "instrument": "SNARE", "step": 98, "velocity": 0.5 },
            { "instrument": "KICK", "step": 99, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 99, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 100, "velocity": 0.5 },
            { "instrument": "KICK", "step": 101, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 101, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 102, "velocity": 0.5 },
            { "instrument": "SNARE", "step": 106, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 108, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 109, "velocity": 0.5 },
            { "instrument": "RIDE", "step": 110, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 111, "velocity": 0.5 },
            { "instrument": "KICK", "step": 112, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 112, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 113, "velocity": 0.5 },
            { "instrument": "RIDE", "step": 114, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 115, "velocity": 0.8 },
            { "instrument": "KICK", "step": 118, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 118, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 120, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 121, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 123, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 125, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 127, "velocity": 0.8 }
        ]
    },

    // ============================================
    // 示例 2：American Football - 中西部 Emo
    // ============================================
    {
        "description": "中西部 Emo (American Football风格): 稳定的8分音符 Hi-hat 贯穿始终，Kick 在弱拍上频繁出现营造推进感，Hi-hat Open 在 backbeat 位置增添空间感，Crash 用于段落过渡，偶尔出现 Snare roll 作为情绪铺垫",
        "bpm": 150,
        "timeSignature": "4/4",
        "subdivisionsPerBeat": 4,
        "totalSteps": 128,
        "bars": 8,
        "notes": [
            // Bar 1: Crash 开头
            { "instrument": "KICK", "step": 0, "velocity": 0.5 },
            { "instrument": "CRASH", "step": 0, "velocity": 0.5 },
            { "instrument": "HIHAT_CLOSED", "step": 4, "velocity": 0.8 },
            { "instrument": "KICK", "step": 6, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 8, "velocity": 0.8 },
            { "instrument": "HIHAT_OPEN", "step": 10, "velocity": 0.5 },
            { "instrument": "HIHAT_CLOSED", "step": 12, "velocity": 0.8 },
            { "instrument": "KICK", "step": 14, "velocity": 0.8 },
            // Bar 2
            { "instrument": "HIHAT_CLOSED", "step": 16, "velocity": 0.8 },
            { "instrument": "KICK", "step": 18, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 20, "velocity": 0.8 },
            { "instrument": "HIHAT_OPEN", "step": 22, "velocity": 0.5 },
            { "instrument": "HIHAT_CLOSED", "step": 24, "velocity": 0.8 },
            { "instrument": "KICK", "step": 26, "velocity": 0.8 },
            { "instrument": "HIHAT_CLOSED", "step": 28, "velocity": 0.8 },
            { "instrument": "KICK", "step": 30, "velocity": 0.8 },
            // Bar 3
            { "instrument": "SNARE", "step": 32, "velocity": 0.8 },
            { "instrument": "HIHAT_OPEN", "step": 34, "velocity": 0.5 },
            { "instrument": "HIHAT_CLOSED", "step": 36, "velocity": 0.8 },
            { "instrument": "KICK", "step": 38, "velocity": 0.8 },
            { "instrument": "HIHAT_CLOSED", "step": 40, "velocity": 0.8 },
            { "instrument": "KICK", "step": 42, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 44, "velocity": 0.8 },
            { "instrument": "KICK", "step": 46, "velocity": 0.8 },
            // Bar 4: Crash transition
            { "instrument": "KICK", "step": 48, "velocity": 0.5 },
            { "instrument": "CRASH", "step": 48, "velocity": 0.5 },
            { "instrument": "HIHAT_CLOSED", "step": 52, "velocity": 0.8 },
            { "instrument": "KICK", "step": 54, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 56, "velocity": 0.8 },
            { "instrument": "HIHAT_OPEN", "step": 58, "velocity": 0.5 },
            { "instrument": "HIHAT_CLOSED", "step": 60, "velocity": 0.8 },
            { "instrument": "KICK", "step": 62, "velocity": 0.8 },
            // Bar 5
            { "instrument": "HIHAT_CLOSED", "step": 64, "velocity": 0.8 },
            { "instrument": "KICK", "step": 66, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 68, "velocity": 0.8 },
            { "instrument": "HIHAT_OPEN", "step": 70, "velocity": 0.5 },
            { "instrument": "HIHAT_CLOSED", "step": 72, "velocity": 0.8 },
            { "instrument": "KICK", "step": 74, "velocity": 0.8 },
            { "instrument": "HIHAT_CLOSED", "step": 76, "velocity": 0.8 },
            { "instrument": "KICK", "step": 78, "velocity": 0.8 },
            // Bar 6
            { "instrument": "SNARE", "step": 80, "velocity": 0.8 },
            { "instrument": "HIHAT_OPEN", "step": 82, "velocity": 0.5 },
            { "instrument": "HIHAT_CLOSED", "step": 84, "velocity": 0.8 },
            { "instrument": "KICK", "step": 86, "velocity": 0.8 },
            { "instrument": "HIHAT_CLOSED", "step": 88, "velocity": 0.8 },
            { "instrument": "KICK", "step": 90, "velocity": 0.8 },
            { "instrument": "KICK", "step": 92, "velocity": 0.8 },
            { "instrument": "HIHAT_OPEN", "step": 94, "velocity": 0.5 },
            // Bar 7: Variation
            { "instrument": "SNARE", "step": 96, "velocity": 0.8 },
            { "instrument": "KICK", "step": 98, "velocity": 0.8 },
            { "instrument": "KICK", "step": 100, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 102, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 103, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 104, "velocity": 0.8 },
            { "instrument": "KICK", "step": 106, "velocity": 0.8 },
            // Bar 8: Crash ending
            { "instrument": "KICK", "step": 108, "velocity": 0.5 },
            { "instrument": "CRASH", "step": 108, "velocity": 0.5 },
            { "instrument": "HIHAT_CLOSED", "step": 112, "velocity": 0.8 },
            { "instrument": "KICK", "step": 114, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 116, "velocity": 0.8 },
            { "instrument": "HIHAT_OPEN", "step": 118, "velocity": 0.5 },
            { "instrument": "HIHAT_CLOSED", "step": 120, "velocity": 0.8 },
            { "instrument": "KICK", "step": 122, "velocity": 0.8 },
            { "instrument": "HIHAT_CLOSED", "step": 124, "velocity": 0.8 },
            { "instrument": "KICK", "step": 126, "velocity": 0.8 }
        ]
    },

    // ============================================
    // 示例 3：toe - 孤独の発明 (一专)
    // ============================================
    {
        "description": "日式数摇早期风格 (toe一专《孤独の発明》): 在标准4/4拍中创造出强烈的变拍错觉，Ride与Snare高密度交替形成标志性的'对话感'，Snare连击(roll)作为段落过渡，Tom鼓点缀增添层次，Hi-hat Open固定在小节末营造呼吸节点，Crash标记段落起始，整体节奏紧凑却不失呼吸感",
        "bpm": 122,
        "timeSignature": "4/4",
        "subdivisionsPerBeat": 4,
        "totalSteps": 128,
        "bars": 8,
        "notes": [
            // Bar 1: Crash开场 + Ride/Snare对话
            { "instrument": "KICK", "step": 0, "velocity": 0.8 },
            { "instrument": "CRASH", "step": 0, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 2, "velocity": 0.8 },
            { "instrument": "HIHAT_CLOSED", "step": 3, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 4, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 5, "velocity": 0.8 },
            { "instrument": "KICK", "step": 6, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 6, "velocity": 0.8 },
            { "instrument": "KICK", "step": 7, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 8, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 9, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 10, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 11, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 12, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 13, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 14, "velocity": 0.8 },
            { "instrument": "HIHAT_OPEN", "step": 15, "velocity": 0.8 },
            // Bar 2
            { "instrument": "KICK", "step": 16, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 16, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 18, "velocity": 0.8 },
            { "instrument": "HIHAT_CLOSED", "step": 19, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 20, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 21, "velocity": 0.8 },
            { "instrument": "KICK", "step": 22, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 22, "velocity": 0.8 },
            { "instrument": "KICK", "step": 23, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 24, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 25, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 26, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 27, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 28, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 29, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 30, "velocity": 0.8 },
            { "instrument": "HIHAT_OPEN", "step": 31, "velocity": 0.8 },
            // Bar 3
            { "instrument": "KICK", "step": 32, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 32, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 34, "velocity": 0.8 },
            { "instrument": "HIHAT_CLOSED", "step": 35, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 36, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 37, "velocity": 0.8 },
            { "instrument": "KICK", "step": 38, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 38, "velocity": 0.8 },
            { "instrument": "KICK", "step": 39, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 40, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 41, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 42, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 43, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 44, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 45, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 46, "velocity": 0.8 },
            { "instrument": "HIHAT_OPEN", "step": 47, "velocity": 0.8 },
            // Bar 4: Fill with Tom
            { "instrument": "KICK", "step": 48, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 48, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 50, "velocity": 0.8 },
            { "instrument": "HIHAT_CLOSED", "step": 51, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 52, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 54, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 55, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 56, "velocity": 0.8 },
            { "instrument": "TOM_HIGH", "step": 58, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 59, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 61, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 62, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 63, "velocity": 0.8 },
            // Bar 5: Crash reset
            { "instrument": "KICK", "step": 64, "velocity": 0.8 },
            { "instrument": "CRASH", "step": 64, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 66, "velocity": 0.8 },
            { "instrument": "HIHAT_CLOSED", "step": 67, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 68, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 69, "velocity": 0.8 },
            { "instrument": "KICK", "step": 70, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 70, "velocity": 0.8 },
            { "instrument": "KICK", "step": 71, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 72, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 73, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 74, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 75, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 76, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 77, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 78, "velocity": 0.8 },
            { "instrument": "HIHAT_OPEN", "step": 79, "velocity": 0.8 },
            // Bar 6: Tom transition
            { "instrument": "KICK", "step": 80, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 80, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 82, "velocity": 0.8 },
            { "instrument": "HIHAT_CLOSED", "step": 83, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 84, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 85, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 86, "velocity": 0.8 },
            { "instrument": "TOM_HIGH", "step": 87, "velocity": 0.8 },
            { "instrument": "TOM_HIGH", "step": 88, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 89, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 90, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 91, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 92, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 93, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 94, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 95, "velocity": 0.8 },
            // Bar 7
            { "instrument": "KICK", "step": 96, "velocity": 0.8 },
            { "instrument": "CRASH", "step": 96, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 98, "velocity": 0.8 },
            { "instrument": "HIHAT_CLOSED", "step": 99, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 100, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 101, "velocity": 0.8 },
            { "instrument": "KICK", "step": 102, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 102, "velocity": 0.8 },
            { "instrument": "KICK", "step": 103, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 104, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 105, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 106, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 107, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 108, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 109, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 110, "velocity": 0.8 },
            { "instrument": "HIHAT_OPEN", "step": 111, "velocity": 0.8 },
            // Bar 8: Ending with Tom descend
            { "instrument": "KICK", "step": 112, "velocity": 0.8 },
            { "instrument": "CRASH", "step": 112, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 114, "velocity": 0.8 },
            { "instrument": "HIHAT_CLOSED", "step": 115, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 116, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 117, "velocity": 0.8 },
            { "instrument": "KICK", "step": 118, "velocity": 0.8 },
            { "instrument": "RIDE", "step": 118, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 120, "velocity": 0.8 },
            { "instrument": "TOM_HIGH", "step": 122, "velocity": 0.8 },
            { "instrument": "SNARE", "step": 124, "velocity": 0.8 },
            { "instrument": "TOM_HIGH", "step": 125, "velocity": 0.8 },
            { "instrument": "TOM_LOW", "step": 126, "velocity": 0.8 },
            { "instrument": "KICK", "step": 127, "velocity": 0.8 }
        ]
    },

    // ============================================
    // 在此处添加更多示例...
    // ============================================
];

/**
 * 将 Few-Shot 示例格式化为 Prompt 字符串
 */
export function formatFewShotExamples(): string {
    if (FEW_SHOT_PATTERNS.length === 0) {
        return '';
    }

    const examples = FEW_SHOT_PATTERNS.map((pattern, index) => {
        // 只取前32个音符作为示例，避免 prompt 过长
        const sampleNotes = pattern.notes.slice(0, 32);
        const samplePattern = { ...pattern, notes: sampleNotes };

        return `EXAMPLE ${index + 1} (${pattern.timeSignature} @ ${pattern.bpm} BPM - ${pattern.description}):
${JSON.stringify(samplePattern, null, 2)}`;
    }).join('\n\n');

    return `
LEARNING FROM REAL DRUM PATTERNS (study these carefully):
${examples}
`;
}

/**
 * 获取所有示例的风格标签
 */
export function getExampleStyles(): string[] {
    return FEW_SHOT_PATTERNS.map(p => p.description);
}
