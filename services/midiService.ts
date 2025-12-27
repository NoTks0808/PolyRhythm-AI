import { GeneratedPattern, DrumInstrument } from '../types';
import { MIDI_MAP } from '../constants';

function encodeVarLen(value: number): number[] {
  if (value === 0) return [0];
  const bytes: number[] = [];
  let v = value;
  while (v > 0) {
    bytes.push(v & 0x7F);
    v >>= 7;
  }
  for (let i = 1; i < bytes.length; i++) {
    bytes[i] |= 0x80;
  }
  return bytes.reverse();
}

interface MidiEvent {
  tick: number;
  type: 'on' | 'off';
  note: number;
  velocity: number;
}

export const generateMidiBlob = (pattern: GeneratedPattern): Blob => {
  const header = [
    0x4D, 0x54, 0x68, 0x64, 
    0x00, 0x00, 0x00, 0x06, 
    0x00, 0x00,             
    0x00, 0x01,             
    0x01, 0xE0              // 480 ticks per quarter note
  ];

  const ticksPerBeat = 480;
  // Fix: Calculate ticks per step dynamically based on subdivisions
  // If subdivisionsPerBeat is 4 (16th notes), ticks = 120.
  // If subdivisionsPerBeat is 8 (32nd notes), ticks = 60.
  const subdivisions = pattern.subdivisionsPerBeat || 4;
  const ticksPerStep = Math.round(ticksPerBeat / subdivisions);

  let trackEvents: number[] = [];
  
  // Time Signature
  const [numStr, denStr] = pattern.timeSignature.split('/');
  const numerator = parseInt(numStr, 10);
  const denominator = parseInt(denStr, 10);
  const denominatorPower = Math.log2(denominator);

  trackEvents.push(0x00, 0xFF, 0x58, 0x04, numerator, denominatorPower, 0x18, 0x08);

  // Tempo
  const microsecondsPerBeat = Math.round(60000000 / pattern.bpm);
  trackEvents.push(0x00, 0xFF, 0x51, 0x03, 
      (microsecondsPerBeat >> 16) & 0xFF, 
      (microsecondsPerBeat >> 8) & 0xFF, 
      microsecondsPerBeat & 0xFF
  );

  const allEvents: MidiEvent[] = [];
  // Shorten note duration for higher speeds/resolutions to avoid overlap
  const NOTE_DURATION = subdivisions >= 8 ? 30 : 60; 

  pattern.notes.forEach(note => {
    if (note.velocity <= 0) return;

    const startTick = Math.round(note.step * ticksPerStep);
    const endTick = startTick + NOTE_DURATION;
    const midiNote = MIDI_MAP[note.instrument] || 38;
    const velocity = Math.floor(note.velocity * 127);

    allEvents.push({ tick: startTick, type: 'on', note: midiNote, velocity: velocity });
    allEvents.push({ tick: endTick, type: 'off', note: midiNote, velocity: 0 });
  });

  allEvents.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === 'off' && b.type === 'on') return -1;
    if (a.type === 'on' && b.type === 'off') return 1;
    return 0;
  });

  let lastTick = 0;
  allEvents.forEach(evt => {
    const delta = evt.tick - lastTick;
    trackEvents.push(...encodeVarLen(delta));
    const status = evt.type === 'on' ? 0x99 : 0x89;
    trackEvents.push(status, evt.note, evt.velocity);
    lastTick = evt.tick;
  });

  trackEvents.push(0x00, 0xFF, 0x2F, 0x00);

  const trackHeader = [
    0x4D, 0x54, 0x72, 0x6B, 
    ...[(trackEvents.length >>> 24) & 0xFF, (trackEvents.length >>> 16) & 0xFF, (trackEvents.length >>> 8) & 0xFF, trackEvents.length & 0xFF]
  ];

  const fileBytes = new Uint8Array([...header, ...trackHeader, ...trackEvents]);
  return new Blob([fileBytes], { type: 'audio/midi' });
};