/**
 * 鼓轨道提取器
 * 从 MIDI 数据中识别并提取鼓轨道
 */

// MIDI 音符 → DrumInstrument 映射
const MIDI_TO_DRUM = {
    // Kick
    35: 'KICK',  // Acoustic Bass Drum
    36: 'KICK',  // Bass Drum 1

    // Snare
    38: 'SNARE', // Acoustic Snare
    40: 'SNARE', // Electric Snare
    37: 'SNARE', // Side Stick (归类为 snare)

    // Hi-Hat
    42: 'HIHAT_CLOSED', // Closed Hi-Hat
    44: 'HIHAT_CLOSED', // Pedal Hi-Hat
    46: 'HIHAT_OPEN',   // Open Hi-Hat

    // Toms - Low
    41: 'TOM_LOW',  // Low Floor Tom
    43: 'TOM_LOW',  // High Floor Tom
    45: 'TOM_LOW',  // Low Tom

    // Toms - High
    47: 'TOM_HIGH', // Low-Mid Tom
    48: 'TOM_HIGH', // High-Mid Tom
    50: 'TOM_HIGH', // High Tom

    // Crash
    49: 'CRASH',    // Crash Cymbal 1
    52: 'CRASH',    // Chinese Cymbal
    55: 'CRASH',    // Splash Cymbal
    57: 'CRASH',    // Crash Cymbal 2

    // Ride
    51: 'RIDE',     // Ride Cymbal 1
    53: 'RIDE',     // Ride Bell
    59: 'RIDE',     // Ride Cymbal 2
};

// 有效的 DrumInstrument 枚举值
export const DRUM_INSTRUMENTS = [
    'KICK', 'SNARE', 'HIHAT_CLOSED', 'HIHAT_OPEN',
    'TOM_LOW', 'TOM_HIGH', 'CRASH', 'RIDE'
];

/**
 * 从 MIDI 数据中提取鼓轨道
 * @param {Object} midiData - parseMidi 返回的数据
 * @returns {Object} 提取结果
 */
export function extractDrumTrack(midiData) {
    const { tracks, ticksPerQuarterNote } = midiData;

    let drumTrackIndex = -1;
    let drumNotes = [];
    let bpm = 120; // 默认 BPM
    let timeSignature = { numerator: 4, denominator: 4 };
    let trackName = '';

    // 遍历所有轨道
    tracks.forEach((track, index) => {
        const { events } = track;

        // 检查 Meta 事件 (Tempo, Time Signature, Track Name)
        events.forEach(event => {
            if (event.type === 'meta') {
                // Tempo (0x51)
                if (event.metaType === 0x51 && event.data.length === 3) {
                    const microsecondsPerBeat = (event.data[0] << 16) | (event.data[1] << 8) | event.data[2];
                    bpm = Math.round(60000000 / microsecondsPerBeat);
                }
                // Time Signature (0x58)
                if (event.metaType === 0x58 && event.data.length >= 2) {
                    timeSignature = {
                        numerator: event.data[0],
                        denominator: Math.pow(2, event.data[1])
                    };
                }
                // Track Name (0x03)
                if (event.metaType === 0x03) {
                    const name = String.fromCharCode(...event.data).toLowerCase();
                    if (name.includes('drum') || name.includes('perc') || name.includes('kit')) {
                        drumTrackIndex = index;
                        trackName = name;
                    }
                }
            }
        });

        // 检查是否是鼓轨道 (Channel 10 = index 9)
        const noteOnEvents = events.filter(e => e.subtype === 'noteOn');
        const hasChannel9 = noteOnEvents.some(e => e.channel === 9);
        const hasDrumNotes = noteOnEvents.some(e => e.note >= 35 && e.note <= 81);

        if (hasChannel9 || (hasDrumNotes && drumTrackIndex === -1)) {
            if (drumTrackIndex === -1 || hasChannel9) {
                drumTrackIndex = index;
            }
        }
    });

    // 如果找到了鼓轨道，提取音符
    let lastTick = 0;
    if (drumTrackIndex >= 0) {
        const drumTrack = tracks[drumTrackIndex];

        drumTrack.events.forEach(event => {
            if (event.subtype === 'noteOn' && event.velocity > 0) {
                const instrument = MIDI_TO_DRUM[event.note];
                if (instrument) {
                    drumNotes.push({
                        tick: event.tick,
                        instrument,
                        midiNote: event.note,
                        rawVelocity: event.velocity
                    });
                    if (event.tick > lastTick) {
                        lastTick = event.tick;
                    }
                }
            }
        });
    }

    // 计算小节数
    // 每小节的 ticks = ticksPerQuarterNote * (4 / denominator) * numerator
    const ticksPerBar = ticksPerQuarterNote * (4 / timeSignature.denominator) * timeSignature.numerator;
    const calculatedBars = lastTick > 0 ? Math.ceil(lastTick / ticksPerBar) : 4;

    return {
        found: drumTrackIndex >= 0,
        trackIndex: drumTrackIndex,
        trackName,
        bpm,
        timeSignature: `${timeSignature.numerator}/${timeSignature.denominator}`,
        ticksPerQuarterNote,
        calculatedBars, // 新增：自动计算的小节数
        notes: drumNotes
    };
}

/**
 * 将原始 velocity (0-127) 转换为简化值
 * 重音 = 1.0, 正常 = 0.8, 轻音 = 0.5
 */
export function normalizeVelocity(rawVelocity) {
    if (rawVelocity >= 96) return 1.0;  // 重音
    if (rawVelocity >= 64) return 0.8;  // 正常
    return 0.5;                          // 轻音 (Ghost Note)
}
