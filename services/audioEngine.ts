import { DrumInstrument, DrumKit, GeneratedPattern } from '../types';

// 简单粗暴的路径修正：只用 /samples/
// 这种写法同时兼容本地 (localhost:3000/samples/...) 和 GitHub Pages (如果不改 base)
// 如果你 Vite 配置了 base，这里会自动适配
const BASE_PATH = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

const LOCAL_SAMPLE_MAP: Record<DrumInstrument, string> = {
  [DrumInstrument.KICK]: `${BASE_PATH}samples/kick.wav`,
  [DrumInstrument.SNARE]: `${BASE_PATH}samples/snare.wav`,
  [DrumInstrument.HIHAT_CLOSED]: `${BASE_PATH}samples/hatClosed.wav`,
  [DrumInstrument.HIHAT_OPEN]: `${BASE_PATH}samples/hatOpen.wav`,
  [DrumInstrument.TOM_LOW]: `${BASE_PATH}samples/tomLow.wav`,
  [DrumInstrument.TOM_HIGH]: `${BASE_PATH}samples/tomHigh.wav`,
  [DrumInstrument.CRASH]: `${BASE_PATH}samples/crash.wav`,
  [DrumInstrument.RIDE]: `${BASE_PATH}samples/ride.wav`,
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterChain: AudioNode | null = null;
  private buffers: Map<DrumInstrument, AudioBuffer> = new Map();
  private isLoaded: boolean = false;
  
  // 避免重复加载的锁
  private isLoadingSamples: boolean = false;

  private noiseBuffer: AudioBuffer | null = null;
  private distortionCurve: Float32Array | null = null;
  private softClipCurve: Float32Array | null = null;
  private currentKit: DrumKit = DrumKit.ACOUSTIC;

  constructor() {}

  public async setKit(kit: DrumKit) {
    this.currentKit = kit;
    // 切换到原声鼓时，如果还没加载，尝试加载（不阻塞）
    if (kit === DrumKit.ACOUSTIC && !this.isLoaded) {
        this.loadLocalSamples();
    }
  }

  public getKit(): DrumKit { return this.currentKit; }
  public getCurrentTime(): number { return this.ctx?.currentTime || 0; }

  // 🔥 核心修改：Init 绝不等待采样加载
  public async init() {
    if (!this.ctx) {
      console.log("[AudioEngine] 初始化核心...");
      const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new CtxClass();
      
      const safetyFilter = this.ctx.createBiquadFilter();
      safetyFilter.type = 'highpass'; safetyFilter.frequency.value = 30;
      this.createSoftClipCurve();
      const softClipper = this.ctx.createWaveShaper();
      if (this.softClipCurve) softClipper.curve = this.softClipCurve as any;
      softClipper.oversample = '4x';
      const masterGain = this.ctx.createGain();
      masterGain.gain.value = 0.8; 

      safetyFilter.connect(softClipper); softClipper.connect(masterGain); masterGain.connect(this.ctx.destination);
      this.masterChain = safetyFilter;
      
      // 合成器资源立刻准备好
      this.createNoiseBuffer();
      this.createDistortionCurve(400); 
    }

    // 强力唤醒
    if (this.ctx.state === 'suspended') {
      console.log("[AudioEngine] 尝试唤醒...");
      await this.ctx.resume();
    }
    
    // 🔥 关键：在这里启动加载，但【不使用 await】
    // 这样 init 会立刻完成，App.tsx 里的 await audio.init() 也会立刻通过
    // 电子鼓和工业鼓马上就能用！
    if (!this.isLoaded && !this.isLoadingSamples) {
        this.loadLocalSamples(); 
    }
  }

  private async loadLocalSamples() {
    if (this.isLoaded || this.isLoadingSamples) return;
    this.isLoadingSamples = true;

    console.log("[AudioEngine] 后台开始下载采样...");
    const promises = Object.entries(LOCAL_SAMPLE_MAP).map(async ([inst, path]) => {
        try {
            // 防缓存
            const fetchPath = `${path}?t=${Date.now()}`; 
            const response = await fetch(fetchPath);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            if (this.ctx) {
                const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                this.buffers.set(inst as DrumInstrument, audioBuffer);
            }
        } catch (e: any) {
            console.warn(`⚠️ 采样加载失败 [${inst}]:`, e.message || e);
        }
    });

    await Promise.all(promises);
    this.isLoaded = true;
    this.isLoadingSamples = false;
    console.log(`[AudioEngine] 采样加载结束。可用: ${this.buffers.size}/8`);
  }

  // ... (资源生成函数保持不变) ...
  private createSoftClipCurve() { const n=65536; const c=new Float32Array(n); for(let i=0;i<n;i++) c[i]=Math.tanh((i*2)/n-1); this.softClipCurve=c; }
  private createNoiseBuffer() { if(!this.ctx)return; const b=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; this.noiseBuffer=b; }
  private createDistortionCurve(amount: number) { const n=44100; const c=new Float32Array(n); const deg=Math.PI/180; for(let i=0;i<n;++i){const x=i*2/n-1;c[i]=(3+amount)*x*20*deg/(Math.PI+amount*Math.abs(x));} this.distortionCurve=c; }

  private scheduleNoteGraph(ctx: BaseAudioContext, destination: AudioNode, instrument: DrumInstrument, time: number, velocity: number, kit: DrumKit) {
    const safeTime = Math.max(ctx.currentTime, time);

    // 1. 电子/工业鼓 -> 这里的资源在 init() 里已经好了，应该 100% 能响
    if (kit === DrumKit.ELECTRONIC || kit === DrumKit.INDUSTRIAL) {
        this.synthesizeDrum(ctx, destination, instrument, safeTime, velocity, kit);
        return;
    }

    // 2. 原声鼓 -> 依赖异步加载的 buffer
    const buffer = this.buffers.get(instrument);
    if (!buffer) {
        // 如果文件还没下好，暂时不响，也不报错
        return;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (instrument !== DrumInstrument.KICK && instrument !== DrumInstrument.SNARE) {
        source.detune.value = (Math.random() * 20) - 10;
    }
    const envGain = ctx.createGain();
    const targetGain = velocity * velocity; 
    envGain.gain.setValueAtTime(0, safeTime);
    envGain.gain.linearRampToValueAtTime(targetGain, safeTime + 0.002);
    envGain.gain.exponentialRampToValueAtTime(0.001, safeTime + 3.0); 
    source.connect(envGain); envGain.connect(destination);
    source.start(safeTime);
  }

  private synthesizeDrum(ctx: BaseAudioContext, destination: AudioNode, inst: DrumInstrument, time: number, vel: number, kit: DrumKit) {
    // 工业风/电子风 合成逻辑 (保持之前可用的版本)
    const isIndustrial = kit === DrumKit.INDUSTRIAL;
    const osc = ctx.createOscillator(); 
    const noise = ctx.createBufferSource();
    if (this.noiseBuffer) noise.buffer = this.noiseBuffer; // noiseBuffer 在 init 时创建，肯定有
    const masterGain = ctx.createGain(); 
    
    let chainOut: AudioNode = masterGain;

    if (isIndustrial) {
        const dist = ctx.createWaveShaper(); if (this.distortionCurve) dist.curve = this.distortionCurve as any; dist.oversample = '4x';
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 3000 + (vel * 2000);
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -30; comp.ratio.value = 12;
        masterGain.disconnect(); masterGain.connect(dist); dist.connect(filter); filter.connect(comp); chainOut = comp;
    } else {
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4; comp.attack.value = 0.001;
        masterGain.disconnect(); masterGain.connect(comp); chainOut = comp;
    }
    
    chainOut.connect(destination);
    const baseVol = vel;

    // 简单的合成音色映射
    switch (inst) {
        case DrumInstrument.KICK:
            osc.frequency.setValueAtTime(isIndustrial ? 120 : 150, time); osc.frequency.exponentialRampToValueAtTime(40, time + 0.5);
            masterGain.gain.setValueAtTime(baseVol, time); masterGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
            osc.connect(masterGain); osc.start(time); osc.stop(time + 0.5); break;
        case DrumInstrument.SNARE:
            osc.type = 'triangle'; osc.frequency.setValueAtTime(200, time);
            const toneGain = ctx.createGain(); toneGain.gain.setValueAtTime(baseVol * 0.5, time); toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
            osc.connect(toneGain); toneGain.connect(masterGain);
            const noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'highpass'; noiseFilter.frequency.value = 1000;
            const noiseGain = ctx.createGain(); noiseGain.gain.setValueAtTime(baseVol * (isIndustrial ? 1.5 : 0.8), time); noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
            noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(masterGain);
            osc.start(time); osc.stop(time + 0.2); noise.start(time); noise.stop(time + 0.3); break;
        case DrumInstrument.HIHAT_CLOSED: case DrumInstrument.HIHAT_OPEN:
            const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = isIndustrial ? 3000 : 7000;
            const dur = inst === DrumInstrument.HIHAT_OPEN ? 0.3 : 0.05;
            masterGain.gain.setValueAtTime(baseVol * 0.4, time); masterGain.gain.exponentialRampToValueAtTime(0.001, time + dur);
            noise.connect(hp); hp.connect(masterGain); noise.start(time); noise.stop(time + dur); break;
        default: // Toms / Crash
            osc.type = 'sine'; const freq = inst === DrumInstrument.TOM_LOW ? 80 : 200;
            osc.frequency.setValueAtTime(freq, time); osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.3);
            masterGain.gain.setValueAtTime(baseVol, time); masterGain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
            osc.connect(masterGain); osc.start(time); osc.stop(time + 0.3); break;
    }
  }

  public trigger(instrument: DrumInstrument, time: number, velocity: number) {
    // 🔥 如果 Context 意外没了，重新 init 一下
    if (!this.ctx) { 
        this.init(); 
        return; 
    }
    this.scheduleNoteGraph(this.ctx, this.masterChain!, instrument, time, velocity, this.currentKit);
  }

  public async exportWav(pattern: GeneratedPattern): Promise<Blob> {
      await this.init(); // 导出时还是需要 await 一下，确保环境没问题
      // 简化导出...
      return new Blob([], { type: "audio/wav" }); 
  }
}

export const audioEngine = new AudioEngine();