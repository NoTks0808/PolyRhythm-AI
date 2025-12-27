import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GeneratedPattern, DrumInstrument, GenerationParams, DrumNote } from '../types';

// ============================================================================
// ⚙️ Google Gemini 动态配置
// ============================================================================

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

// JSON 结构定义
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING },
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
  // ✨ 获取前端传来的 model 参数
  const { prompt, timeSignature, bpm, bars, model } = params;

  const [numerator, denominator] = timeSignature.split('/').map(Number);
  const stepsPerBar = Math.round((numerator / denominator) * 16);
  const grandTotalSteps = stepsPerBar * bars;
  const maxStepIndex = grandTotalSteps - 1;
  
  const systemPrompt = `
    You are a virtuoso Math Rock drummer (expert in bands like American Football, TTNG, Chon).
    
    ABSOLUTE RULES:
    1. **Time Unit**: 1 Step = 1 Sixteenth Note (1/16).
    2. **Total Length**: Exactly ${grandTotalSteps} steps.
    3. **Range**: Step 0 to ${maxStepIndex}.
    
    ⛔️ ANTI-PATTERNS:
    - NO MACHINE GUNS: Vary velocities (humanize).
    - NO WALL OF SOUND: Use silence creatively.
    - **NO DUPLICATES**: Do NOT place the same instrument twice on the same step.
    
    LEARNING FROM MASTERS:
    ${FEW_SHOT_EXAMPLES}

    TASK: Interpret "${prompt}" into a complex drum pattern.
    INPUT CONTEXT: Time Signature: ${timeSignature}, Bars: ${bars}
  `;

  try {
    // 3. 动态调用模型
    const response = await ai.models.generateContent({
      model: model, 
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.75,
      }
    });

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (responseText) {
      const data = JSON.parse(responseText) as GeneratedPattern;
      
      const uniqueNotesMap = new Map<string, DrumNote>();

      data.notes.forEach(note => {
        if (note.step >= grandTotalSteps) return;
        const cleanVelocity = Math.max(0.1, Math.min(1.0, note.velocity));
        const key = `${Math.round(note.step)}-${note.instrument}`;

        if (uniqueNotesMap.has(key)) {
            const existing = uniqueNotesMap.get(key)!;
            if (cleanVelocity > existing.velocity) {
                uniqueNotesMap.set(key, { ...note, velocity: cleanVelocity });
            }
        } else {
            uniqueNotesMap.set(key, { ...note, velocity: cleanVelocity });
        }
      });

      const sanitizedNotes = Array.from(uniqueNotesMap.values()).sort((a, b) => a.step - b.step);

      if (sanitizedNotes.length === 0) throw new Error("AI generated an empty pattern.");

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
      throw new Error("Empty response from Gemini.");
    }
  } catch (error: any) {
    console.error(`Gemini API Error (${model}):`, error);
    
    if (error.message?.includes('404')) {
        throw new Error(`模型 ${model} 不可用或权限不足 (404)`);
    }
    if (error.message?.includes('429')) {
        throw new Error("当前模型请求过快 (429)，请在上方切换其他模型重试！");
    }
    throw error;
  }
};
