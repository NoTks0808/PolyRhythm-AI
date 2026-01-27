/**
 * MIDI 二进制解析器
 * 解析 Standard MIDI File (SMF) 格式
 */

/**
 * 解析 MIDI 文件
 * @param {ArrayBuffer} buffer - MIDI 文件的二进制数据
 * @returns {Object} 解析后的 MIDI 数据
 */
export function parseMidi(buffer) {
  const data = new DataView(buffer);
  let offset = 0;

  // 读取 Header Chunk
  const headerChunk = readChunk(data, offset);
  if (headerChunk.type !== 'MThd') {
    throw new Error('无效的 MIDI 文件：缺少 MThd 头');
  }
  offset += 8 + headerChunk.length;

  const header = parseHeader(headerChunk.data);

  // 读取 Track Chunks
  const tracks = [];
  for (let i = 0; i < header.trackCount; i++) {
    if (offset >= buffer.byteLength) break;
    
    const trackChunk = readChunk(data, offset);
    if (trackChunk.type !== 'MTrk') {
      console.warn(`跳过非轨道块: ${trackChunk.type}`);
      offset += 8 + trackChunk.length;
      continue;
    }
    offset += 8 + trackChunk.length;

    const track = parseTrack(trackChunk.data);
    tracks.push(track);
  }

  return {
    format: header.format,
    trackCount: header.trackCount,
    ticksPerQuarterNote: header.division,
    tracks
  };
}

/**
 * 读取一个 Chunk
 */
function readChunk(data, offset) {
  const type = String.fromCharCode(
    data.getUint8(offset),
    data.getUint8(offset + 1),
    data.getUint8(offset + 2),
    data.getUint8(offset + 3)
  );
  const length = data.getUint32(offset + 4);
  const chunkData = new DataView(data.buffer, offset + 8, length);
  
  return { type, length, data: chunkData };
}

/**
 * 解析 Header
 */
function parseHeader(data) {
  return {
    format: data.getUint16(0),
    trackCount: data.getUint16(2),
    division: data.getUint16(4)
  };
}

/**
 * 解析 Track
 */
function parseTrack(data) {
  const events = [];
  let offset = 0;
  let runningStatus = 0;
  let absoluteTick = 0;

  while (offset < data.byteLength) {
    // 读取 Delta Time (VLQ)
    const deltaResult = readVLQ(data, offset);
    const deltaTime = deltaResult.value;
    offset = deltaResult.newOffset;
    absoluteTick += deltaTime;

    // 读取事件
    let eventByte = data.getUint8(offset);

    // Meta Event
    if (eventByte === 0xFF) {
      offset++;
      const metaType = data.getUint8(offset++);
      const lenResult = readVLQ(data, offset);
      const metaLength = lenResult.value;
      offset = lenResult.newOffset;

      const metaData = [];
      for (let i = 0; i < metaLength; i++) {
        metaData.push(data.getUint8(offset++));
      }

      events.push({
        tick: absoluteTick,
        type: 'meta',
        metaType,
        data: metaData
      });
      continue;
    }

    // SysEx Event
    if (eventByte === 0xF0 || eventByte === 0xF7) {
      offset++;
      const lenResult = readVLQ(data, offset);
      offset = lenResult.newOffset + lenResult.value;
      continue;
    }

    // Channel Event
    let status = eventByte;
    if (eventByte < 0x80) {
      // Running Status
      status = runningStatus;
    } else {
      runningStatus = status;
      offset++;
    }

    const channel = status & 0x0F;
    const command = status & 0xF0;

    let event = {
      tick: absoluteTick,
      channel,
      type: 'channel'
    };

    switch (command) {
      case 0x80: // Note Off
        event.subtype = 'noteOff';
        event.note = data.getUint8(offset++);
        event.velocity = data.getUint8(offset++);
        break;
      case 0x90: // Note On
        event.subtype = 'noteOn';
        event.note = data.getUint8(offset++);
        event.velocity = data.getUint8(offset++);
        // velocity = 0 等同于 Note Off
        if (event.velocity === 0) {
          event.subtype = 'noteOff';
        }
        break;
      case 0xA0: // Aftertouch
        offset += 2;
        continue;
      case 0xB0: // Control Change
        offset += 2;
        continue;
      case 0xC0: // Program Change
        offset += 1;
        continue;
      case 0xD0: // Channel Pressure
        offset += 1;
        continue;
      case 0xE0: // Pitch Bend
        offset += 2;
        continue;
      default:
        console.warn(`未知命令: 0x${command.toString(16)}`);
        break;
    }

    events.push(event);
  }

  return { events };
}

/**
 * 读取 Variable Length Quantity (VLQ)
 */
function readVLQ(data, offset) {
  let value = 0;
  let byte;
  
  do {
    if (offset >= data.byteLength) break;
    byte = data.getUint8(offset++);
    value = (value << 7) | (byte & 0x7F);
  } while (byte & 0x80);

  return { value, newOffset: offset };
}
