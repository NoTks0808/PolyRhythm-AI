import OpenAI from 'openai';
import { GeneratedPattern, DrumInstrument, GenerationParams, DrumNote } from '../types';

// ============================================================================
// ⚙️ LLM 核心配置区 (根据你的喜好切换)
// ============================================================================

// 🟢 方案 A: 阿里巴巴 Qwen 2.5-Coder (当前推荐，代码/JSON能力极强)
// 获取 Key: https://bailian.console.aliyun.com/
const CONFIG = {
  provider: 'Alibaba Qwen',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', 
  apiKey: import.meta.env.VITE_DASHSCOPE_API_KEY || '', // 请在 .env 添加 VITE_DASHSCOPE_API_KEY
  model: 'qwen-max', // 或者 'qwen-plus', 'qwen-max'
};

// 🔵 方案 B: DeepSeek V3 (性价比之王)
// 获取 Key: https://platform.deepseek.com/
/*
const CONFIG = {
  provider: 'DeepSeek',
  baseURL: 'https://api.deepseek.com',
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
  model: 'deepseek-chat', 
};
*/

// ============================================================================

const client = new OpenAI({
  baseURL: CONFIG.baseURL,
  apiKey: CONFIG.apiKey,
  dangerouslyAllowBrowser: true // 允许前端直接调用 (注意安全)
});

// Math Rock 黄金样本库
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

  // 计算总步数
  const [numerator, denominator] = timeSignature.split('/').map(Number);
  // 16分音符为基准
  const stepsPerBar = Math.round((numerator / denominator) * 16);
  const grandTotalSteps = stepsPerBar * bars;
  const maxStepIndex = grandTotalSteps - 1;
  
  const systemPrompt = `
    You are a legendary Math Rock drummer using the '${CONFIG.provider}' engine.
    
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
    IMPORTANT: Return ONLY raw JSON. No markdown formatting (no \`\`\`json).
    
    JSON Schema:
    {
      "description": "string",
      "notes": [
        {"instrument": "KICK|SNARE|HIHAT_CLOSED|HIHAT_OPEN|TOM_LOW|TOM_HIGH|CRASH|RIDE", "step": number, "velocity": 0.0-1.0}
      ]
    }
  `;

  try {
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate pattern: ${prompt}. Sig: ${timeSignature}, Bars: ${bars}` }
      ],
      model: CONFIG.model,
      temperature: 0.7,
      // 强制 JSON 模式 (大多数新模型都支持)
      response_format: { type: "json_object" }, 
    });

    const responseContent = completion.choices[0].message.content;
    
    if (responseContent) {
      const data = JSON.parse(responseContent) as GeneratedPattern;
      
      // --- 数据清洗与去重 (防止 AI 犯错) ---
      const uniqueNotesMap = new Map<string, DrumNote>();

      data.notes.forEach(note => {
        // 1. 越界检查
        if (note.step >= grandTotalSteps) return;
        
        // 2. 规范化力度
        const cleanVelocity = Math.max(0.1, Math.min(1.0, note.velocity));
        const cleanNote = { ...note, velocity: cleanVelocity };

        // 3. 唯一键生成 (Step + Instrument)
        const key = `${note.step}-${note.instrument}`;

        // 4. 冲突解决 (保留力度大的)
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
      throw new Error("Empty response from LLM");
    }
  } catch (error: any) {
    console.error(`LLM Generation Error (${CONFIG.provider}):`, error);
    // 抛出更友好的错误信息
    if (error.message?.includes('401')) {
      throw new Error(`API Key 无效，请检查 .env 文件中的配置`);
    }
    if (error.message?.includes('429')) {
      throw new Error(`请求太快了，请稍等一下 (Rate Limit)`);
    }
    throw error;
  }
};