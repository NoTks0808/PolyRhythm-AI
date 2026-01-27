# MIDI → JSON 鼓谱转换器

将 MIDI 文件中的鼓轨道转换为 PolyRhythm AI 兼容的 JSON 格式。

## 使用方法

### 1. 启动本地服务器

```bash
cd midi-to-json-tool
npx serve .
```

然后访问 http://localhost:3000

### 2. 上传 MIDI 文件

- 拖拽 `.mid` / `.midi` 文件到页面
- 或点击选择文件

### 3. 获取 JSON

- 调整小节数和描述
- 点击"复制 JSON"或"下载 JSON"

## 输出格式

```json
{
  "description": "节奏描述",
  "bpm": 120,
  "timeSignature": "4/4",
  "subdivisionsPerBeat": 4,
  "totalSteps": 64,
  "bars": 4,
  "notes": [
    {"instrument": "KICK", "step": 0, "velocity": 1.0},
    {"instrument": "SNARE", "step": 4, "velocity": 0.8}
  ]
}
```

## 力度映射

| MIDI Velocity | 输出 |
|---------------|------|
| 96-127 | 1.0 (重音) |
| 64-95 | 0.8 (正常) |
| 1-63 | 0.5 (轻音) |

## 支持的乐器

KICK, SNARE, HIHAT_CLOSED, HIHAT_OPEN, TOM_LOW, TOM_HIGH, CRASH, RIDE
