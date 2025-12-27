import { DrumInstrument, DrumKit, GeneratedPattern } from '../types';

// === 核心修复：动态路径解析 ===
// 使用 import.meta.env.BASE_URL 自动适配本地和 GitHub Pages 路径
// 防止出现 "/samples/kick.wav" 404 的问题
const BASE = import.meta.env.BASE_URL || '/';

const LOCAL_SAMPLE_MAP: Record<DrumInstrument, string> = {
  [DrumInstrument.KICK]: `${BASE}samples/kick.wav`,
  [DrumInstrument.SNARE]: `${BASE}samples/snare.wav`,
  [DrumInstrument.HIHAT_CLOSED]: `${BASE}samples/hatClosed.wav`,
  [DrumInstrument.HIHAT_OPEN]: `${BASE}samples/hatOpen.wav`,
  [DrumInstrument.TOM_LOW]: `${BASE}samples/tomLow.wav`,
  [DrumInstrument.TOM_HIGH]: `${BASE}samples/tomHigh.wav`,
  [DrumInstrument.CRASH]: `${BASE}samples/crash.wav`,
  [DrumInstrument.RIDE]: `${BASE}samples/ride.wav`,
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterChain: AudioNode | null = null;
  
  // 采样缓存
  private buffers: Map<DrumInstrument, AudioBuffer> = new Map();
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  // 合成器辅助缓存
  private noiseBuffer: AudioBuffer | null = null;
  private distortionCurve: Float32Array | null = null;
  private softClipCurve: Float32Array | null = null;

  private currentKit: DrumKit = DrumKit.ACOUSTIC;

  constructor() {}

  public async setKit(kit: DrumKit) {
    this.currentKit = kit;
    // 如果是原声鼓，确保本地文件已加载
    if (kit === DrumKit.ACOUSTIC && !this.isLoaded) {
        await this.loadLocalSamples();
    }
  }

  public getKit(): DrumKit {
    return this.currentKit;
  }

  public getCurrentTime(): number {
    return this.ctx?.currentTime || 0;
  }

  public async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // --- 总线链 (Master Bus) ---
      const safetyFilter = this.ctx.createBiquadFilter();
      safetyFilter.type = 'highpass';
      safetyFilter.frequency.value = 30;

      this.createSoftClipCurve();
      const softClipper = this.ctx.createWaveShaper();
      if (this.softClipCurve) softClipper.curve = this.softClipCurve as any;
      softClipper.oversample = '4x';

      const masterGain = this.ctx.createGain();
      masterGain.gain.value = 0.8; 

      safetyFilter.connect(softClipper);
      softClipper.connect(masterGain);
      masterGain.connect(this.ctx.destination);
      
      this.masterChain = safetyFilter;

      this.createNoiseBuffer();
      this.createDistortionCurve(400); 
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    
    // 初始化时尝试加载本地文件
    if (!this.isLoaded) {
        await this.loadLocalSamples();
    }
  }

  // --- 初始化辅助函数 ---

  private createSoftClipCurve() {
    const n_samples = 65536;
    const curve = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; i++) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = Math.tanh(x); 
    }
    this.softClipCurve = curve;
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; 
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
  }

  private createDistortionCurve(amount: number) {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = i * 2 / n_samples - 1;
      curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
    }
    this.distortionCurve = curve;
  }

  // --- 核心：加载本地 WAV ---
  private async loadLocalSamples() {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
        const promises = Object.entries(LOCAL_SAMPLE_MAP).map(async ([inst, path]) => {
            try {
                // 这里的 path 现在包含了正确的 BASE_URL
                const response = await fetch(path);
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${path}`);
                const arrayBuffer = await response.arrayBuffer();
                if (this.ctx) {
                    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                    this.buffers.set(inst as DrumInstrument, audioBuffer);
                }
            } catch (e) {
                console.error(`无法加载本地文件: ${path}`, e);
            }
        });
        await Promise.all(promises);
        this.isLoaded = true;
    })();
    return this.loadPromise;
  }

  // --- 调度器 ---

  private scheduleNoteGraph(
      ctx: BaseAudioContext, 
      destination: AudioNode,
      instrument: DrumInstrument, 
      time: number, 
      velocity: number,
      kit: DrumKit
  ) {
    const safeTime = Math.max(ctx.currentTime, time);

    // === 分支 1: 电子/工业 (使用代码合成) ===
    if (kit === DrumKit.ELECTRONIC || kit === DrumKit.INDUSTRIAL) {
        this.synthesizeDrum(ctx, destination, instrument, safeTime, velocity, kit);
        return;
    }

    // === 分支 2: 原声 (使用本地采样) ===
    const buffer = this.buffers.get(instrument);
    
    // 如果还没加载完，直接静音，不要报错
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    // 原声鼓微调
    if (instrument !== DrumInstrument.KICK && instrument !== DrumInstrument.SNARE) {
        source.detune.value = (Math.random() * 20) - 10;
    }

    const envGain = ctx.createGain();
    const targetGain = velocity * velocity; 
    
    envGain.gain.setValueAtTime(0, safeTime);
    envGain.gain.linearRampToValueAtTime(targetGain, safeTime + 0.002);
    envGain.gain.exponentialRampToValueAtTime(0.001, safeTime + 3.0); 

    source.connect(envGain);
    envGain.connect(destination);
    source.start(safeTime);
  }

  // --- 合成引擎 (保持不变，用于电子/工业) ---
  private synthesizeDrum(
    ctx: BaseAudioContext, 
    destination: AudioNode, 
    inst: DrumInstrument, 
    time: number, 
    vel: number, 
    kit: DrumKit
  ) {
    const isIndustrial = kit === DrumKit.INDUSTRIAL;
    const osc = ctx.createOscillator();
    const noise = ctx.createBufferSource();
    if (this.noiseBuffer) noise.buffer = this.noiseBuffer;
    const masterGain = ctx.createGain();
    
    let chainOut: AudioNode = masterGain;

    if (isIndustrial) {
        const dist = ctx.createWaveShaper();
        if (this.distortionCurve) dist.curve = this.distortionCurve as any;
        dist.oversample = '4x';
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 3000 + (vel * 2000);
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -30;
        comp.ratio.value = 12;

        masterGain.disconnect();
        masterGain.connect(dist);
        dist.connect(filter);
        filter.connect(comp);
        chainOut = comp;
    } else {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -20;
        comp.ratio.value = 4;
        comp.attack.value = 0.001;
        masterGain.disconnect();
        masterGain.connect(comp);
        chainOut = comp;
    }
    
    chainOut.connect(destination);
    const baseVol = vel;

    switch (inst) {
        case DrumInstrument.KICK:
            osc.frequency.setValueAtTime(isIndustrial ? 120 : 150, time);
            osc.frequency.exponentialRampToValueAtTime(40, time + 0.5);
            masterGain.gain.setValueAtTime(baseVol, time);
            masterGain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
            osc.connect(masterGain);
            osc.start(time); osc.stop(time + 0.5);
            break;
        case DrumInstrument.SNARE:
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, time);
            const toneGain = ctx.createGain();
            toneGain.gain.setValueAtTime(baseVol * 0.5, time);
            toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
            osc.connect(toneGain); toneGain.connect(masterGain);
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.value = 1000;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(baseVol * (isIndustrial ? 1.5 : 0.8), time);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
            noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(masterGain);
            osc.start(time); osc.stop(time + 0.2);
            noise.start(time); noise.stop(time + 0.3);
            break;
        case DrumInstrument.HIHAT_CLOSED:
        case DrumInstrument.HIHAT_OPEN:
            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = isIndustrial ? 3000 : 7000;
            const dur = inst === DrumInstrument.HIHAT_OPEN ? 0.3 : 0.05;
            masterGain.gain.setValueAtTime(baseVol * 0.4, time);
            masterGain.gain.exponentialRampToValueAtTime(0.001, time + dur);
            noise.connect(hp); hp.connect(masterGain);
            noise.start(time); noise.stop(time + dur);
            break;
        default: 
            osc.type = 'sine';
            const freq = inst === DrumInstrument.TOM_LOW ? 80 : 200;
            osc.frequency.setValueAtTime(freq, time);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.3);
            masterGain.gain.setValueAtTime(baseVol, time);
            masterGain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
            osc.connect(masterGain);
            osc.start(time); osc.stop(time + 0.3);
            break;
    }
  }

  // --- 公共 API ---
  public trigger(instrument: DrumInstrument, time: number, velocity: number) {
    if (!this.ctx || !this.masterChain) return;
    this.scheduleNoteGraph(this.ctx, this.masterChain, instrument, time, velocity, this.currentKit);
  }

  public async exportWav(pattern: GeneratedPattern): Promise<Blob> {
      if (!this.isLoaded) await this.loadLocalSamples();
      
      const secondsPerBeat = 60.0 / pattern.bpm;
      const beatCount = pattern.totalSteps / (pattern.subdivisionsPerBeat || 4);
      const renderDuration = (beatCount * secondsPerBeat) + 2.0; 
      const sampleRate = 44100;
      const offlineCtx = new OfflineAudioContext(2, sampleRate * renderDuration, sampleRate);
      
      const safetyFilter = offlineCtx.createBiquadFilter();
      safetyFilter.type = 'highpass'; safetyFilter.frequency.value = 30;
      const softClipper = offlineCtx.createWaveShaper();
      if (this.softClipCurve) softClipper.curve = this.softClipCurve as any;
      const masterGain = offlineCtx.createGain();
      masterGain.gain.value = 0.6;
      safetyFilter.connect(softClipper); softClipper.connect(masterGain); masterGain.connect(offlineCtx.destination);

      const offlineNoise = offlineCtx.createBuffer(1, sampleRate * 2, sampleRate);
      const out = offlineNoise.getChannelData(0);
      for(let i=0; i<out.length; i++) out[i] = Math.random()*2-1;
      const oldNoise = this.noiseBuffer;
      this.noiseBuffer = offlineNoise;

      const stepDuration = secondsPerBeat / (pattern.subdivisionsPerBeat || 4);
      pattern.notes.forEach(note => {
          const time = note.step * stepDuration;
          this.scheduleNoteGraph(offlineCtx, safetyFilter, note.instrument, time, note.velocity, this.currentKit);
      });

      const renderedBuffer = await offlineCtx.startRendering();
      this.noiseBuffer = oldNoise; 
      return this.bufferToWav(renderedBuffer);
  }

  private bufferToWav(abuffer: AudioBuffer): Blob {
    const numOfChan = abuffer.numberOfChannels;
    const length = abuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i; let sample; let offset = 0; let pos = 0;
    function setUint16(data: any) { view.setUint16(offset, data, true); offset += 2; }
    function setUint32(data: any) { view.setUint32(offset, data, true); offset += 4; }
    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157); 
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan); 
    setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - pos - 4); 
    for(i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));
    while(pos < abuffer.length) {
        for(i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][pos]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0;
            view.setInt16(offset, sample, true); offset += 2;
        }
        pos++;
    }
    return new Blob([buffer], { type: "audio/wav" });
  }
}
export const audioEngine = new AudioEngine();