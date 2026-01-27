import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GeneratedPattern, DrumInstrument, DrumNote } from '../types';

interface VisualizerProps {
  pattern: GeneratedPattern | null;
  isPlaying: boolean;
  currentStepRef: React.MutableRefObject<number>;
  // 编辑相关 Props
  editable?: boolean;
  selectedNoteIds?: Set<string>;
  onNoteAdd?: (instrument: DrumInstrument, step: number, velocity: number) => void;
  onNoteDelete?: (noteId: string) => void;
  onNoteMove?: (noteId: string, newStep: number, newInstrument: DrumInstrument) => void;
  onNoteVelocityChange?: (noteId: string, velocity: number) => void;
  onNoteSelect?: (noteId: string, addToSelection: boolean) => void;
  onClearSelection?: () => void;
}

const INSTRUMENT_LABELS: Record<DrumInstrument, string> = {
  [DrumInstrument.CRASH]: 'CRASH',
  [DrumInstrument.RIDE]: 'RIDE',
  [DrumInstrument.HIHAT_OPEN]: 'OH',
  [DrumInstrument.HIHAT_CLOSED]: 'CH',
  [DrumInstrument.TOM_HIGH]: 'HT',
  [DrumInstrument.TOM_LOW]: 'LT',
  [DrumInstrument.SNARE]: 'SD',
  [DrumInstrument.KICK]: 'BD',
};

const DISPLAY_ORDER: DrumInstrument[] = [
  DrumInstrument.CRASH,
  DrumInstrument.RIDE,
  DrumInstrument.HIHAT_OPEN,
  DrumInstrument.HIHAT_CLOSED,
  DrumInstrument.TOM_HIGH,
  DrumInstrument.TOM_LOW,
  DrumInstrument.SNARE,
  DrumInstrument.KICK,
];

// 视觉网格参数：按16分音符显示
const VISUAL_GRID_WIDTH_PX = 32;  // 每个16分音符格子的宽度
const ROW_HEIGHT_PX = 32;
const VISUAL_GRID_UNIT = 2;  // 1个视觉格子 = 2个内部步数（2个32分音符 = 1个16分音符）

// 拖拽状态类型
interface DragState {
  type: 'creating' | 'moving';
  noteId?: string;
  startY: number;
  startVelocity: number;
  instrument: DrumInstrument;
  step: number;
  currentVelocity: number;
}

const Visualizer: React.FC<VisualizerProps> = React.memo(({
  pattern,
  isPlaying,
  currentStepRef,
  editable = false,
  selectedNoteIds = new Set(),
  onNoteAdd,
  onNoteDelete,
  onNoteMove,
  onNoteVelocityChange,
  onNoteSelect,
  onClearSelection,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localStep, setLocalStep] = useState(-1);
  const [hoveredCell, setHoveredCell] = useState<{ inst: DrumInstrument; step: number } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  // 临时力度指示器
  const [tempVelocity, setTempVelocity] = useState<number | null>(null);

  // 计算小节/拍参数（基于32分音符步数）
  const getGridParams = useCallback(() => {
    if (!pattern) return { stepsPerBeat: 8, stepsPerBar: 32, visualGridsPerBar: 16 };
    const [num, den] = pattern.timeSignature.split('/').map(Number);
    const stepsPerBeat = pattern.subdivisionsPerBeat || 8;  // 每拍8个32分音符
    const stepsPerBar = num * stepsPerBeat;  // 整个小节的32分音符数量
    const visualGridsPerBar = stepsPerBar / VISUAL_GRID_UNIT;  // 视觉网格数量（16分音符）
    return { stepsPerBeat, stepsPerBar, visualGridsPerBar };
  }, [pattern]);

  // 播放位置更新循环
  useEffect(() => {
    let animationFrameId: number;
    const renderLoop = () => {
      if (isPlaying) {
        const actualStep = currentStepRef.current;
        setLocalStep(prev => (prev !== actualStep ? actualStep : prev));
      } else {
        setLocalStep(-1);
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, currentStepRef]);

  // 自动滚动到当前播放位置
  useEffect(() => {
    if (!pattern || !containerRef.current || localStep === -1) return;
    const viewWidth = containerRef.current.clientWidth;
    const visualStep = localStep / VISUAL_GRID_UNIT;  // 转换为视觉网格单位
    const targetLeft = (visualStep * VISUAL_GRID_WIDTH_PX) - (viewWidth / 2) + (VISUAL_GRID_WIDTH_PX / 2);
    containerRef.current.scrollTo({ left: targetLeft, behavior: 'smooth' });
  }, [localStep, pattern]);

  // 获取指定位置的音符
  const getNote = useCallback((inst: DrumInstrument, step: number): DrumNote | undefined => {
    return pattern?.notes.find(n => n.instrument === inst && n.step === step);
  }, [pattern]);

  // 获取分隔线样式（简化为2种：小节线和16分音符线）
  const getGridLineClass = useCallback((visualGridIndex: number) => {
    const { visualGridsPerBar } = getGridParams();
    if (visualGridIndex % visualGridsPerBar === 0) {
      // 小节线 - 粗线，带发光
      return 'border-l-[3px] border-[var(--accent-primary)]/80 shadow-[0_0_4px_var(--glow-primary)]';
    }
    // 16分音符线 - 细线
    return 'border-l border-[var(--border-subtle)]/40';
  }, [getGridParams]);

  // ========== 鼠标事件处理 ==========

  // 单击：创建音符或选择
  const handleCellMouseDown = useCallback((
    e: React.MouseEvent,
    inst: DrumInstrument,
    step: number
  ) => {
    if (!editable) return;
    e.preventDefault();

    const note = getNote(inst, step);

    if (note) {
      // 已有音符 - 选择它
      onNoteSelect?.(note.id, e.shiftKey);
      // 开始拖拽（用于移动）
      setDragState({
        type: 'moving',
        noteId: note.id,
        startY: e.clientY,
        startVelocity: note.velocity,
        instrument: inst,
        step,
        currentVelocity: note.velocity,
      });
    } else {
      // 空格 - 开始创建音符
      onClearSelection?.();
      setDragState({
        type: 'creating',
        startY: e.clientY,
        startVelocity: 0.8,
        instrument: inst,
        step,
        currentVelocity: 0.8,
      });
      setTempVelocity(0.8);
    }
  }, [editable, getNote, onNoteSelect, onClearSelection]);

  // 鼠标移动：调整力度
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;

    const deltaY = dragState.startY - e.clientY; // 向上为正
    const velocityDelta = deltaY / 100; // 100px = 1.0 力度变化
    const newVelocity = Math.max(0.1, Math.min(1, dragState.startVelocity + velocityDelta));

    setDragState(prev => prev ? { ...prev, currentVelocity: newVelocity } : null);
    setTempVelocity(newVelocity);
  }, [dragState]);

  // 鼠标释放：确认操作
  const handleMouseUp = useCallback(() => {
    if (!dragState) return;

    if (dragState.type === 'creating') {
      // 创建音符
      onNoteAdd?.(dragState.instrument, dragState.step, dragState.currentVelocity);
    } else if (dragState.type === 'moving' && dragState.noteId) {
      // 如果力度变化了，更新力度
      if (Math.abs(dragState.currentVelocity - dragState.startVelocity) > 0.01) {
        onNoteVelocityChange?.(dragState.noteId, dragState.currentVelocity);
      }
    }

    setDragState(null);
    setTempVelocity(null);
  }, [dragState, onNoteAdd, onNoteVelocityChange]);

  // 双击：删除音符
  const handleCellDoubleClick = useCallback((
    e: React.MouseEvent,
    inst: DrumInstrument,
    step: number
  ) => {
    if (!editable) return;
    e.preventDefault();

    const note = getNote(inst, step);
    if (note) {
      onNoteDelete?.(note.id);
    }
  }, [editable, getNote, onNoteDelete]);

  // 全局鼠标事件
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState) {
        handleMouseUp();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [dragState, handleMouseUp]);

  // ========== 渲染 ==========

  if (!pattern) return (
    <div className="h-full w-full flex items-center justify-center border border-[var(--border-subtle)] rounded-lg bg-black/20 text-[var(--text-muted)] font-mono text-sm">
      <p className="animate-pulse">WAITING_FOR_INPUT...</p>
    </div>
  );

  const steps = pattern.totalSteps;
  const visualGridCount = Math.ceil(steps / VISUAL_GRID_UNIT);  // 视觉网格数量（16分音符）
  const totalWidth = visualGridCount * VISUAL_GRID_WIDTH_PX;
  const { stepsPerBar, visualGridsPerBar } = getGridParams();

  // 不需要gridScrollRef了，用更简单的方式

  return (
    <div
      className="w-full h-full rounded-lg border-none bg-transparent select-none overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setHoveredCell(null)}
    >
      <div className="h-full flex flex-col justify-center py-4">
        {/* Header - 分离固定列和可滚动部分 */}
        <div className="flex mb-2 px-4">
          <div className="w-12 flex-shrink-0"></div>
          <div className="flex-1 overflow-x-auto overflow-y-hidden" ref={containerRef}>
            <div className="flex border-b border-[var(--border-subtle)] pb-2" style={{ width: `${totalWidth}px` }}>
              {Array.from({ length: visualGridCount }).map((_, i) => {
                const isBarStart = i % visualGridsPerBar === 0;
                const barNumber = Math.floor(i / visualGridsPerBar) + 1;
                const isCurrentStep = Math.floor(localStep / VISUAL_GRID_UNIT) === i;

                return (
                  <div
                    key={i}
                    className={`flex-shrink-0 text-center font-mono text-[10px] flex flex-col justify-end pb-1
                      ${isCurrentStep ? 'text-[var(--accent-primary)] font-bold drop-shadow-[0_0_8px_var(--glow-primary)]' : 'text-[var(--text-muted)]'}
                      ${isBarStart ? 'font-bold' : ''}
                    `}
                    style={{ width: `${VISUAL_GRID_WIDTH_PX}px` }}
                  >
                    {isBarStart ? `${barNumber}` : ''}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grid Rows - 分离固定乐器列和可滚动网格*/}
        <div className="flex px-4">
          {/* 固定左侧乐器标签列 */}
          <div className="flex flex-col gap-0.5 w-12 flex-shrink-0">
            {DISPLAY_ORDER.map((inst) => (
              <div
                key={inst}
                className="text-[10px] font-mono text-[var(--text-muted)] font-bold text-right pr-3 tracking-wider hover:text-[var(--text-primary)] transition-colors flex items-center justify-end"
                style={{ height: `${ROW_HEIGHT_PX}px` }}
              >
                {INSTRUMENT_LABELS[inst]}
              </div>
            ))}
          </div>

          {/* 可滚动网格区域 */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex flex-col gap-0.5" style={{ minWidth: `${totalWidth}px` }}>
              {DISPLAY_ORDER.map((inst, rowIndex) => (
                <div
                  key={inst}
                  className="flex items-center group"
                  style={{ height: `${ROW_HEIGHT_PX}px` }}
                >
                  {/* Grid Cells - 按16分音符视觉网格显示 */}
                  <div className="flex h-full relative">
                    {Array.from({ length: visualGridCount }).map((_, visualIndex) => {
                      // 将视觉网格索引转换为内部步数（32分音符）
                      const stepIndex = visualIndex * VISUAL_GRID_UNIT;
                      const note = getNote(inst, stepIndex);
                      const isActive = Math.floor(localStep / VISUAL_GRID_UNIT) === visualIndex;
                      const isHovered = hoveredCell?.inst === inst && Math.floor((hoveredCell?.step || 0) / VISUAL_GRID_UNIT) === visualIndex;
                      const isSelected = note && selectedNoteIds.has(note.id);
                      const isDraggingThis = dragState?.instrument === inst && dragState?.step === stepIndex;

                      // 计算显示的力度
                      let displayVelocity = note?.velocity ?? 0;
                      if (isDraggingThis && tempVelocity !== null) {
                        displayVelocity = tempVelocity;
                      }

                      // 分隔线样式
                      const gridLineClass = getGridLineClass(visualIndex);

                      // 计算当前格子所在的小节编号（从0开始）
                      const barNumber = Math.floor(visualIndex / visualGridsPerBar);
                      const isEvenBar = barNumber % 2 === 0;

                      // 计算音符宽度（基于duration）
                      const noteWidthInGrids = note ? (note.duration / VISUAL_GRID_UNIT) : 1;
                      const noteWidthPx = noteWidthInGrids * VISUAL_GRID_WIDTH_PX;

                      return (
                        <div
                          key={visualIndex}
                          className={`
                            flex-shrink-0 h-full relative cursor-pointer
                            ${gridLineClass}
                            ${editable ? 'hover:bg-white/10' : ''}
                            ${isEvenBar ? '' : 'bg-white/[0.015]'} 
                            transition-colors
                          `}
                          style={{ width: `${VISUAL_GRID_WIDTH_PX}px`, padding: '2px' }}
                          onMouseDown={(e) => handleCellMouseDown(e, inst, stepIndex)}
                          onDoubleClick={(e) => handleCellDoubleClick(e, inst, stepIndex)}
                          onMouseEnter={() => setHoveredCell({ inst, step: stepIndex })}
                        >
                          {/* 空格子背景 (可见网格) */}
                          <div className={`
                            absolute inset-0.5 rounded-sm
                            ${note ? '' : 'bg-white/[0.02]'}
                            ${isHovered && !note && editable ? 'bg-white/10 border border-dashed border-white/20' : ''}
                          `} />

                          {/* 音符块 - 宽度与时值成正比 */}
                          {(note || isDraggingThis) && (
                            <div
                              className={`
                                absolute top-0.5 left-0.5 bottom-0.5 rounded-sm transition-all
                                bg-[var(--accent-primary)]
                                ${isSelected ? 'ring-2 ring-[var(--accent-secondary)] ring-offset-1 ring-offset-transparent' : ''}
                                ${isDraggingThis ? 'scale-110 z-20' : ''}
                                ${editable ? 'hover:brightness-125 cursor-grab active:cursor-grabbing' : ''}
                              `}
                              style={{
                                width: `${noteWidthPx - 4}px`,  // 减去padding
                                opacity: 0.3 + (displayVelocity * 0.7),
                                boxShadow: `0 0 ${displayVelocity * 15}px var(--glow-primary)`,
                              }}
                            />
                          )}

                          {/* 播放头指示器 */}
                          {isActive && (
                            <div className={`
                              absolute inset-0 rounded-sm
                              ${note ? 'ring-2 ring-white/60 z-10' : 'bg-white/10'}
                            `} />
                          )}

                          {/* 力度指示器 (拖拽时显示) */}
                          {isDraggingThis && tempVelocity !== null && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5 text-[9px] font-mono text-[var(--accent-primary)] whitespace-nowrap z-30">
                              {Math.round(tempVelocity * 100)}%
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 力度提示 */}
        {editable && (
          <div className="mt-4 ml-12 text-[10px] text-[var(--text-muted)] font-mono opacity-60">
            单击=添加 | 上下拖动=调力度 | 双击=删除 | Shift+单击=多选
          </div>
        )}
      </div>
    </div>
  );
});

export default Visualizer;