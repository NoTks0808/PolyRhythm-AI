/**
 * JSON 转换器
 * 将提取的鼓音符转换为 PolyRhythm AI 格式
 */

import { normalizeVelocity, DRUM_INSTRUMENTS } from './drumExtractor.js';

/**
 * 转换为 PolyRhythm AI 的 GeneratedPattern 格式
 * @param {Object} extractedData - extractDrumTrack 返回的数据
 * @param {Object} options - 额外选项
 * @returns {Object} 符合 GeneratedPattern 接口的 JSON
 */
export function convertToJSON(extractedData, options = {}) {
    const {
        bpm,
        timeSignature,
        ticksPerQuarterNote,
        notes: rawNotes
    } = extractedData;

    const {
        description = '',
        bars = 4,
        subdivisionsPerBeat = 4 // 16分音符
    } = options;

    // 解析拍号
    const [numerator, denominator] = timeSignature.split('/').map(Number);

    // 计算总步数
    // 每拍 = subdivisionsPerBeat 步
    // 每小节 = (numerator / denominator * 4) 拍
    const beatsPerBar = numerator / denominator * 4;
    const stepsPerBar = Math.round(beatsPerBar * subdivisionsPerBeat);
    const totalSteps = stepsPerBar * bars;

    // 计算 tick 到 step 的转换系数
    // ticksPerQuarterNote = 1 拍的 ticks
    // 1 step = 1/subdivisionsPerBeat 拍 = ticksPerQuarterNote / subdivisionsPerBeat ticks
    const ticksPerStep = ticksPerQuarterNote / subdivisionsPerBeat;

    // 转换音符
    const convertedNotes = [];
    const noteMap = new Map(); // 用于去重: key = "step-instrument"

    rawNotes.forEach(note => {
        const step = Math.round(note.tick / ticksPerStep);

        // 只保留在范围内的音符
        if (step < 0 || step >= totalSteps) return;

        const velocity = normalizeVelocity(note.rawVelocity);
        const key = `${step}-${note.instrument}`;

        // 去重：保留力度更大的
        if (noteMap.has(key)) {
            const existing = noteMap.get(key);
            if (velocity > existing.velocity) {
                noteMap.set(key, { instrument: note.instrument, step, velocity });
            }
        } else {
            noteMap.set(key, { instrument: note.instrument, step, velocity });
        }
    });

    // 转换为数组并排序
    const sortedNotes = Array.from(noteMap.values())
        .sort((a, b) => a.step - b.step || DRUM_INSTRUMENTS.indexOf(a.instrument) - DRUM_INSTRUMENTS.indexOf(b.instrument));

    // 构建最终 JSON
    return {
        description: description || `Drum pattern from MIDI (${timeSignature} @ ${bpm} BPM)`,
        bpm,
        timeSignature,
        subdivisionsPerBeat,
        totalSteps,
        bars,
        notes: sortedNotes
    };
}

/**
 * 格式化 JSON 输出
 */
export function formatJSON(data) {
    return JSON.stringify(data, null, 2);
}

/**
 * 生成统计信息
 */
export function getStats(data) {
    const instrumentCounts = {};
    DRUM_INSTRUMENTS.forEach(inst => instrumentCounts[inst] = 0);

    data.notes.forEach(note => {
        if (instrumentCounts[note.instrument] !== undefined) {
            instrumentCounts[note.instrument]++;
        }
    });

    return {
        totalNotes: data.notes.length,
        totalSteps: data.totalSteps,
        bars: data.bars,
        bpm: data.bpm,
        timeSignature: data.timeSignature,
        instrumentCounts
    };
}
