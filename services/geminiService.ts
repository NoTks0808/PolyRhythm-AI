import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GeneratedPattern, DrumInstrument, GenerationParams, DrumNote } from '../types';
import { formatFewShotExamples } from '../fewShotExamples';

// 默认 Key (从环境变量获取，作为保底)
const DEFAULT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

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



export const generateDrumPattern = async (params: GenerationParams): Promise<GeneratedPattern> => {
  const { prompt, timeSignature, bpm, bars, model, apiKey } = params;

  // 🔥 核心逻辑：优先用用户的 Key，没有则用默认 Key
  const activeKey = apiKey?.trim() ? apiKey : DEFAULT_API_KEY;

  if (!activeKey) {
    throw new Error("API Key 缺失！请在设置中输入你的 Google Gemini API Key。");
  }

  // 动态实例化 Client
  const ai = new GoogleGenAI({ apiKey: activeKey });

  // 固定为32分音符为最小单位（每个四分音符 = 8步）
  const [numerator, denominator] = timeSignature.split('/').map(Number);
  const stepsPerBar = Math.round((numerator / denominator) * 32);  // 32分音符
  const grandTotalSteps = stepsPerBar * bars;
  const maxStepIndex = grandTotalSteps - 1;

  const systemPrompt = `
    You are a virtuoso Math Rock drummer (expert in bands like toe, American Football, TTNG, Chon).
    
    ABSOLUTE RULES:
    1. **Time Unit**: 1 Step = 1 Thirty-second Note (1/32).
    2. **Total Length**: Exactly ${grandTotalSteps} steps.
    3. **Range**: Step 0 to ${maxStepIndex}.
    4. **Velocity**: Use 1.0 for accents, 0.8 for normal hits, 0.5 for ghost notes.
    5. **Note Duration**: Each note has a 'duration' field (in 32nd note units):
       - duration=1: Thirty-second note (短促)
       - duration=2: Sixteenth note (常规)
       - duration=4: Eighth note (长音)
       - duration=8: Quarter note (很长)
       Use varied durations for musical expression. Short notes (1-2) for fast runs, longer (4+) for cymbals.
    
    ⛔️ ANTI-PATTERNS:
    - NO MACHINE GUNS: Vary velocities (humanize).
    - NO WALL OF SOUND: Use silence creatively.
    - **NO DUPLICATES**: Do NOT place the same instrument twice on the same step.
    
    ${formatFewShotExamples()}

    TASK: Interpret "${prompt}" into a complex drum pattern.
    INPUT CONTEXT: Time Signature: ${timeSignature}, Bars: ${bars}
  `;

  try {
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

    const responseText = response.text;

    if (responseText) {
      const data = JSON.parse(responseText) as GeneratedPattern;

      const uniqueNotesMap = new Map<string, DrumNote>();
      data.notes.forEach(note => {
        if (note.step >= grandTotalSteps) return;
        const cleanVelocity = Math.max(0.1, Math.min(1.0, note.velocity));
        // 使用AI提供的duration，如果没有则默认为2（16分音符）
        const noteDuration = note.duration || 2;
        const key = `${Math.round(note.step)}-${note.instrument}`;
        if (uniqueNotesMap.has(key)) {
          const existing = uniqueNotesMap.get(key)!;
          if (cleanVelocity > existing.velocity) {
            uniqueNotesMap.set(key, { ...note, velocity: cleanVelocity, duration: noteDuration });
          }
        } else {
          uniqueNotesMap.set(key, { ...note, velocity: cleanVelocity, duration: noteDuration });
        }
      });
      const sanitizedNotes = Array.from(uniqueNotesMap.values()).sort((a, b) => a.step - b.step);

      if (sanitizedNotes.length === 0) throw new Error("AI 生成了空节奏，请重试。");

      return {
        ...data,
        bpm: bpm,
        timeSignature: timeSignature,
        subdivisionsPerBeat: 8,  // 固定为8（每拍8个32分音符）
        totalSteps: grandTotalSteps,
        bars: bars,
        notes: sanitizedNotes
      };
    } else {
      throw new Error("Gemini 返回了空内容");
    }
  } catch (error: any) {
    console.error(`Gemini API Error (${model}):`, error);
    if (error.message?.includes('404')) throw new Error(`模型 ${model} 不可用或 Key 权限不足`);
    if (error.message?.includes('429')) throw new Error("配额耗尽 (429)！请尝试在上方填入你自己的 API Key。");
    if (error.message?.includes('400')) throw new Error("API Key 无效，请检查输入。");
    throw error;
  }
};
