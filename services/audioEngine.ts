import { DrumInstrument, DrumKit, GeneratedPattern } from '../types';

const BASE = import.meta.env.BASE_URL || '/';
// 确保路径以 / 结尾
const cleanBase = BASE.endsWith('/') ? BASE : `${BASE}/`;

const LOCAL_SAMPLE_MAP: Record<DrumInstrument, string> = {
  [DrumInstrument.KICK]: `${cleanBase}samples/kick.wav`,
  [DrumInstrument.SNARE]: `${cleanBase}samples/snare.wav`,
  [DrumInstrument.HIHAT_CLOSED]: `${cleanBase}samples/hatClosed.wav`,
  [DrumInstrument.HIHAT_OPEN]: `${cleanBase}samples/hatOpen.wav`,
  [DrumInstrument.TOM_LOW]: `${cleanBase}samples/tomLow.wav`,
  [DrumInstrument.TOM_HIGH]: `${cleanBase}samples/tomHigh.wav`,
  [DrumInstrument.CRASH]: `${cleanBase}samples/crash.wav`,
  [DrumInstrument.RIDE]: `${cleanBase}samples/ride.wav`,
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterChain: AudioNode | null = null;
  private buffers: Map<DrumInstrument, AudioBuffer> = new Map();
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;
  
  // 仅用于电子鼓的合成器资源
  private noiseBuffer: AudioBuffer | null = null;
  private distortionCurve: Float32Array | null = null;
  private softClipCurve: Float32Array | null = null;
  private currentKit: DrumKit = DrumKit.ACOUSTIC;

  constructor() {}

  public async setKit(kit: DrumKit) {
    this.currentKit = kit;
    
    // 🔥 修复点 1：如果 Context 还没初始化，绝对不要尝试加载采样
    // 否则会造成 "fetch了但没解码" 的死锁状态
    if (kit === DrumKit.ACOUSTIC && !this.isLoaded && this.ctx) {
        this.loadLocalSamples();
    }
  }

  public getKit(): DrumKit { return this.currentKit; }
  public getCurrentTime(): number { return this.ctx?.currentTime || 0; }

  public async init() {
    if (!this.ctx) {
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
      this.createNoiseBuffer();
      this.createDistortionCurve(400); 
    }

    // 强制唤醒
    if (this.ctx.state === 'suspended') {
      try {
          await this.ctx.resume();
      } catch (e) {
          console.warn("[AudioEngine] Resume failed", e);
      }
    }
    
    // 🔥 修复点 2：Context 准备好后，在这里统一触发加载
    if (!this.isLoaded) {
        // 不使用 await，让它在后台加载，避免阻塞电子鼓发声
        this.loadLocalSamples();
    }
  }

  // --- 加载逻辑 ---
  private async loadLocalSamples() {
    // 🔥 修复点 3：最强保险。如果没有 ctx，直接拒绝执行，也不返回 promise
    if (!this.ctx) return;

    if (this.loadPromise) return this.loadPromise;
    
    this.loadPromise = (async () => {
        console.log(`[AudioEngine] 开始下载采样...`);
        const promises = Object.entries(LOCAL_SAMPLE_MAP).map(async ([inst, path]) => {
            try {
                // 再次检查 ctx，防止异步过程中的意外
                if (!this.ctx) return; 
                
                const response = await fetch(path);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                
                // 只有解码成功才算加载成功
                const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                this.buffers.set(inst as DrumInstrument, audioBuffer);
            } catch (e) {
                console.error(`❌ 加载失败: ${inst}`, e);
            }
        });
        await Promise.all(promises);
        this.isLoaded = true;
        console.log(`[AudioEngine] 采样加载完毕`);
    })();
    return this.loadPromise;
  }

  // --- 资源生成 (保持不变) ---
  private createSoftClipCurve() { const n=65536; const c=new Float32Array(n); for(let i=0;i<n;i++) c[i]=Math.tanh((i*2)/n-1); this.softClipCurve=c; }
  private createNoiseBuffer() { if(!this.ctx)return; const b=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; this.noiseBuffer=b; }
  private createDistortionCurve(amount: number) { const n=44100; const c=new Float32Array(n); const deg=Math.PI/180; for(let i=0;i<n;++i){const x=i*2/n-1;c[i]=(3+amount)*x*20*deg/(Math.PI+amount*Math.abs(x));} this.distortionCurve=c; }

  // --- 调度器 ---
  private scheduleNoteGraph(ctx: BaseAudioContext, destination: AudioNode, instrument: DrumInstrument, time: number, velocity: number, kit: DrumKit) {
    const safeTime = Math.max(ctx.currentTime, time);

    if (kit === DrumKit.ELECTRONIC || kit === DrumKit.INDUSTRIAL) {
        this.synthesizeDrum(ctx, destination, instrument, safeTime, velocity, kit);
        return;
    }

    const buffer = this.buffers.get(instrument);
    if (!buffer) return; 

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

  // --- 合成器 ---
  private synthesizeDrum(ctx: BaseAudioContext, destination: AudioNode, inst: DrumInstrument, time: number, vel: number, kit: DrumKit) {
    const isIndustrial = kit === DrumKit.INDUSTRIAL;
    const osc = ctx.createOscillator(); const noise = ctx.createBufferSource();
    if (this.noiseBuffer) noise.buffer = this.noiseBuffer;
    const masterGain = ctx.createGain(); let chainOut: AudioNode = masterGain;

    if (isIndustrial) {
        const dist = ctx.createWaveShaper(); if (this.distortionCurve) dist.curve = this.distortionCurve as any; dist.oversample = '4x';
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 3000 + (vel * 2000);
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -30; comp.ratio.value = 12;
        masterGain.disconnect(); masterGain.connect(dist); dist.connect(filter); filter.connect(comp); chainOut = comp;
    } else {
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4; comp.attack.value = 0.001;
        masterGain.disconnect(); masterGain.connect(comp); chainOut = comp;
    }
    chainOut.connect(destination); const baseVol = vel;

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
        default: 
            osc.type = 'sine'; const freq = inst === DrumInstrument.TOM_LOW ? 80 : 200;
            osc.frequency.setValueAtTime(freq, time); osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.3);
            masterGain.gain.setValueAtTime(baseVol, time); masterGain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
            osc.connect(masterGain); osc.start(time); osc.stop(time + 0.3); break;
    }
  }

  public trigger(instrument: DrumInstrument, time: number, velocity: number) {
    if (!this.ctx || !this.masterChain) return;
    this.scheduleNoteGraph(this.ctx, this.masterChain, instrument, time, velocity, this.currentKit);
  }

  public async exportWav(pattern: GeneratedPattern): Promise<Blob> {
      await this.init(); 
      // 如果是为了导出，这里必须等待采样加载完成，否则导出文件是空的
      if (!this.isLoaded) await this.loadLocalSamples();
      
      const secondsPerBeat = 60.0 / pattern.bpm;
      const beatCount = pattern.totalSteps / (pattern.subdivisionsPerBeat || 4);
      const renderDuration = (beatCount * secondsPerBeat) + 2.0; 
      const sampleRate = 44100;
      const offlineCtx = new OfflineAudioContext(2, sampleRate * renderDuration, sampleRate);
      
      const safetyFilter = offlineCtx.createBiquadFilter(); safetyFilter.type = 'highpass'; safetyFilter.frequency.value = 30;
      const softClipper = offlineCtx.createWaveShaper(); if (this.softClipCurve) softClipper.curve = this.softClipCurve as any;
      const masterGain = offlineCtx.createGain(); masterGain.gain.value = 0.6;
      safetyFilter.connect(softClipper); softClipper.connect(masterGain); masterGain.connect(offlineCtx.destination);

      const offlineNoise = offlineCtx.createBuffer(1, sampleRate * 2, sampleRate);
      const out = offlineNoise.getChannelData(0); for(let i=0; i<out.length; i++) out[i] = Math.random()*2-1;
      const oldNoise = this.noiseBuffer; this.noiseBuffer = offlineNoise;

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
    const numOfChan = abuffer.numberOfChannels; const length = abuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length); const view = new DataView(buffer);
    const channels = []; let i; let sample; let offset = 0; let pos = 0;
    function setUint16(data: any) { view.setUint16(offset, data, true); offset += 2; }
    function setUint32(data: any) { view.setUint32(offset, data, true); offset += 4; }
    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157); setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan); setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - pos - 4); 
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