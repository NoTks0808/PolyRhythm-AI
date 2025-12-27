import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GeneratedPattern, DrumInstrument, GenerationParams, DrumNote } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING },
    subdivisionsPerBeat: { type: Type.NUMBER },
    totalSteps: { type: Type.NUMBER },
    notes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          instrument: { type: Type.STRING, enum: Object.values(DrumInstrument) },
          step: { type: Type.NUMBER },
          velocity: { type: Type.NUMBER }
        },
        required: ["instrument", "step", "velocity"]
      }
    }
  },
  required: ["description", "notes"]
};

// 核心资产：Math Rock 黄金样本库
const FEW_SHOT_EXAMPLES = `
EXAMPLE 1 (7/8 Polyrhythmic Groove):
{
  "description": "A tight 7/8 groove with snare displacement.",
  "timeSignature": "7/8",
  "bpm": 130,
  "bars": 1,
  "notes": [
    {"instrument": "HIHAT_CLOSED", "step": 0, "velocity": 0.9},
    {"instrument": "KICK", "step": 0, "velocity": 1.0},
    {"instrument": "SNARE", "step": 4, "velocity": 1.0}, 
    {"instrument": "HIHAT_CLOSED", "step": 4, "velocity": 0.9}
  ]
}
`;

export const generateDrumPattern = async (params: GenerationParams): Promise<GeneratedPattern> => {
  const { prompt, timeSignature, bpm, bars } = params;

  // 1. 严格数学计算
  const [numerator, denominator] = timeSignature.split('/').map(Number);
  const stepsPerBar = Math.round((numerator / denominator) * 16);
  const grandTotalSteps = stepsPerBar * bars;
  const maxStepIndex = grandTotalSteps - 1;
  
  // 2. 构建 Prompt
  const systemPrompt = `
    You are a legendary Math Rock drummer.
    
    ABSOLUTE RULES:
    1. **Time Unit**: 1 Step = 1 Sixteenth Note (1/16).
    2. **Total Length**: Exactly ${grandTotalSteps} steps.
    3. **Range**: Step 0 to ${maxStepIndex}.
    
    ⛔️ ANTI-PATTERNS:
    - NO MACHINE GUNS: Vary velocities.
    - NO WALL OF SOUND: Use silence.
    - **NO DUPLICATES**: Do NOT place the same instrument twice on the same step.
    
    LEARNING FROM MASTERS:
    ${FEW_SHOT_EXAMPLES}

    TASK: Interpret "${prompt}" into a complex drum pattern. Output valid JSON.
  `;

  try {
    // Switch to gemini-3-flash-preview
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      config: { responseMimeType: "application/json", responseSchema: responseSchema, temperature: 0.7 }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as GeneratedPattern;
      
      // --- 核心修复：去重与清洗 ---
      const uniqueNotesMap = new Map<string, DrumNote>();

      data.notes.forEach(note => {
        // 1. Force integer steps to avoid phasing/offset glitches
        const sanitizedStep = Math.round(note.step);
        
        // 1.1 越界检查
        if (sanitizedStep >= grandTotalSteps) return;
        
        // 2. 规范化力度
        const cleanVelocity = Math.max(0.1, Math.min(1.0, note.velocity));
        const cleanNote = { ...note, step: sanitizedStep, velocity: cleanVelocity };

        // 3. 唯一键生成 (Step + Instrument)
        const key = `${sanitizedStep}-${note.instrument}`;

        // 4. 冲突解决：如果同一位置已有同乐器，保留力度大的那个
        if (uniqueNotesMap.has(key)) {
            const existing = uniqueNotesMap.get(key)!;
            if (cleanNote.velocity > existing.velocity) {
                uniqueNotesMap.set(key, cleanNote);
            }
        } else {
            uniqueNotesMap.set(key, cleanNote);
        }
      });

      const sanitizedNotes = Array.from(uniqueNotesMap.values()).sort((a, b) => a.step - b.step);

      return {
        ...data,
        bpm: bpm,
        timeSignature: timeSignature,
        subdivisionsPerBeat: 4,
        totalSteps: grandTotalSteps,
        bars: bars,
        notes: sanitizedNotes
      };
    } else {
      throw new Error("Empty response from AI");
    }
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};