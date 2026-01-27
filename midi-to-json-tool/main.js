/**
 * 主入口文件
 * 处理 UI 交互和文件上传
 */

import { parseMidi } from './midiParser.js';
import { extractDrumTrack } from './drumExtractor.js';
import { convertToJSON, formatJSON, getStats } from './jsonConverter.js';

// DOM 元素
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const resultSection = document.getElementById('result');
const jsonOutput = document.getElementById('jsonOutput');
const barsInput = document.getElementById('barsInput');
const descInput = document.getElementById('descInput');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

// 状态
let currentData = null;
let currentFilename = '';

// 初始化
function init() {
    // 点击上传
    dropzone.addEventListener('click', () => fileInput.click());

    // 文件选择
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // 拖拽
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // 参数变化时重新生成
    barsInput.addEventListener('change', regenerateJSON);
    descInput.addEventListener('input', regenerateJSON);

    // 复制按钮
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(jsonOutput.textContent);
            copyBtn.textContent = '✅ 已复制!';
            setTimeout(() => copyBtn.textContent = '📋 复制 JSON', 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    });

    // 下载按钮
    downloadBtn.addEventListener('click', () => {
        const blob = new Blob([jsonOutput.textContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFilename.replace(/\.(mid|midi)$/i, '') + '.json';
        a.click();
        URL.revokeObjectURL(url);
    });
}

// 处理文件
async function handleFile(file) {
    if (!file.name.match(/\.(mid|midi)$/i)) {
        alert('请上传 .mid 或 .midi 文件');
        return;
    }

    currentFilename = file.name;

    try {
        const buffer = await file.arrayBuffer();
        const midiData = parseMidi(buffer);
        const extracted = extractDrumTrack(midiData);

        if (!extracted.found) {
            alert('未找到鼓轨道！请确保 MIDI 文件包含鼓音轨。');
            return;
        }

        currentData = extracted;

        // 更新 UI
        updateInfo(extracted, file.name);
        regenerateJSON();

        resultSection.classList.remove('hidden');
    } catch (err) {
        console.error('解析错误:', err);
        alert('解析 MIDI 文件时出错: ' + err.message);
    }
}

// 更新信息显示
function updateInfo(data, filename) {
    document.getElementById('fileName').textContent = filename;
    document.getElementById('bpm').textContent = data.bpm;
    document.getElementById('timeSignature').textContent = data.timeSignature;
    document.getElementById('drumTrack').textContent = data.trackName || `轨道 ${data.trackIndex + 1}`;
    document.getElementById('noteCount').textContent = data.notes.length;

    // 自动填入计算出的小节数
    if (data.calculatedBars) {
        barsInput.value = data.calculatedBars;
    }
}

// 重新生成 JSON
function regenerateJSON() {
    if (!currentData) return;

    const bars = parseInt(barsInput.value) || 4;
    const description = descInput.value || '';

    const json = convertToJSON(currentData, { bars, description });
    const stats = getStats(json);

    // 更新显示 - 显示小节数和总步数
    document.getElementById('totalSteps').textContent = `${stats.bars} 小节 (${stats.totalSteps} 步)`;
    jsonOutput.textContent = formatJSON(json);
}

// 启动
init();
