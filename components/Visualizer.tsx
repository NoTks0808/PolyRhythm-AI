import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GeneratedPattern, DrumInstrument, DrumNote } from '../types';

interface VisualizerProps {
  pattern: GeneratedPattern | null;
  isPlaying: boolean;
  currentStepRef: React.MutableRefObject<number>;
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

const GRID_CELL_WIDTH = 32;
const ROW_HEIGHT = 32;
const LABEL_WIDTH = 48;

const Visualizer = React.forwardRef<HTMLDivElement, VisualizerProps>((props, ref) => {
  const {
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
  } = props;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [localStep, setLocalStep] = useState(-1);
  const [hoveredCell, setHoveredCell] = useState<{ inst: DrumInstrument; step: number } | null>(null);
  const [dragState, setDragState] = useState<any>(null);
  const [tempVelocity, setTempVelocity] = useState<number | null>(null);

  const getGridParams = useCallback(() => {
    if (!pattern) return { stepsPerBeat: 8, beatsPerBar: 4, visualCellsPerBar: 16 };

    const [numerator, denominator] = pattern.timeSignature.split('/').map(Number);
    const stepsPerBeat = (4 / denominator) * 8;
    const beatsPerBar = numerator;
    const stepsPerBar = beatsPerBar * stepsPerBeat;
    const visualCellsPerBar = stepsPerBar / 2;

    return { stepsPerBeat, beatsPerBar, visualCellsPerBar };
  }, [pattern]);

  const getNote = useCallback((inst: DrumInstrument, step: number): DrumNote | undefined => {
    return pattern?.notes.find(n => n.instrument === inst && n.step === step);
  }, [pattern]);

  useEffect(() => {
    if (!isPlaying || !pattern) {
      setLocalStep(-1);
      return;
    }
    const interval = setInterval(() => {
      setLocalStep(currentStepRef.current);
    }, 16);
    return () => clearInterval(interval);
  }, [isPlaying, currentStepRef, pattern]);

  // 自动滚动到播放位置
  useEffect(() => {
    if (!pattern || !scrollContainerRef.current || localStep === -1) return;

    const cellIndex = Math.floor(localStep / 2);
    const targetX = cellIndex * GRID_CELL_WIDTH;
    const containerWidth = scrollContainerRef.current.clientWidth - LABEL_WIDTH;
    const scrollLeft = targetX - containerWidth / 2 + GRID_CELL_WIDTH / 2;

    scrollContainerRef.current.scrollTo({
      left: Math.max(0, scrollLeft),
      behavior: 'smooth'
    });
  }, [localStep, pattern]);

  const handleCellMouseDown = (e: React.MouseEvent, inst: DrumInstrument, step: number) => {
    if (!editable) return;
    e.preventDefault();
    const note = getNote(inst, step);
    if (note) {
      if (e.shiftKey && onNoteSelect) {
        onNoteSelect(note.id, true);
      } else {
        setDragState({ type: 'velocity', noteId: note.id, startY: e.clientY, startVelocity: note.velocity });
        setTempVelocity(note.velocity);
      }
    } else {
      onNoteAdd?.(inst, step, 0.8);
    }
  };

  const handleCellDoubleClick = (e: React.MouseEvent, inst: DrumInstrument, step: number) => {
    if (!editable) return;
    const note = getNote(inst, step);
    if (note && onNoteDelete) {
      onNoteDelete(note.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState || dragState.type !== 'velocity') return;
    const deltaY = dragState.startY - e.clientY;
    const velocityChange = deltaY / 100;
    const newVelocity = Math.max(0.1, Math.min(1, dragState.startVelocity + velocityChange));
    setTempVelocity(newVelocity);
  };

  const handleMouseUp = () => {
    if (dragState && dragState.type === 'velocity' && tempVelocity !== null && onNoteVelocityChange) {
      onNoteVelocityChange(dragState.noteId, tempVelocity);
    }
    setDragState(null);
    setTempVelocity(null);
  };

  if (!pattern) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
        Generate a drum pattern to visualize
      </div>
    );
  }

  const { visualCellsPerBar } = getGridParams();
  const visualCellCount = Math.ceil(pattern.totalSteps / 2);
  const gridWidth = visualCellCount * GRID_CELL_WIDTH;

  return (
    <div
      className="w-full h-full flex bg-transparent select-none overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setHoveredCell(null); handleMouseUp(); }}
    >
      {/* 固定左侧乐器标签列 */}
      <div className="flex flex-col flex-shrink-0" style={{ width: LABEL_WIDTH }}>
        {/* Header空白区域 */}
        <div className="border-b border-[var(--border-subtle)] pb-2 mb-2" style={{ height: 28 }}></div>

        {/* 乐器标签 */}
        <div className="flex flex-col gap-0.5">
          {DISPLAY_ORDER.map((inst) => (
            <div
              key={inst}
              className="flex items-center justify-end pr-3 text-[10px] font-mono font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              style={{ height: ROW_HEIGHT }}
            >
              {INSTRUMENT_LABELS[inst]}
            </div>
          ))}
        </div>
      </div>

      {/* 可滚动区域（Header + Grid共享） */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div style={{ width: gridWidth }}>
          {/* Sticky Header */}
          <div className="sticky top-0 bg-[var(--bg-primary)] z-10 border-b border-[var(--border-subtle)] pb-2 mb-2">
            <div className="flex">
              {Array.from({ length: visualCellCount }).map((_, i) => {
                const isBarStart = i % visualCellsPerBar === 0;
                const barNumber = Math.floor(i / visualCellsPerBar) + 1;
                const isCurrentCell = Math.floor(localStep / 2) === i;

                return (
                  <div
                    key={i}
                    className={`flex-shrink-0 text-center font-mono text-[10px] ${isCurrentCell ? 'text-[var(--accent-primary)] font-bold' : 'text-[var(--text-muted)]'
                      } ${isBarStart ? 'font-bold' : ''}`}
                    style={{ width: GRID_CELL_WIDTH, height: 28 }}
                  >
                    {isBarStart ? barNumber : ''}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid */}
          <div className="flex flex-col gap-0.5">
            {DISPLAY_ORDER.map((inst) => (
              <div key={inst} className="flex" style={{ height: ROW_HEIGHT }}>
                {Array.from({ length: visualCellCount }).map((_, cellIndex) => {
                  const step = cellIndex * 2;
                  const note = getNote(inst, step);
                  const isActive = Math.floor(localStep / 2) === cellIndex;
                  const isHovered = hoveredCell?.inst === inst && hoveredCell?.step === step;
                  const isSelected = note && selectedNoteIds.has(note.id);
                  const isDragging = dragState?.noteId === note?.id;

                  const isBarStart = cellIndex % visualCellsPerBar === 0;
                  const gridLineClass = isBarStart
                    ? 'border-l-[4px] border-[var(--accent-primary)] shadow-[0_0_8px_var(--glow-primary)]'
                    : 'border-l border-[var(--border-subtle)]/30';

                  const noteDuration = note?.duration || 2;
                  const noteWidthCells = noteDuration / 2;
                  const noteWidth = noteWidthCells * GRID_CELL_WIDTH;

                  let velocity = note?.velocity ?? 0;
                  if (isDragging && tempVelocity !== null) {
                    velocity = tempVelocity;
                  }

                  return (
                    <div
                      key={cellIndex}
                      className={`relative cursor-pointer ${gridLineClass} ${editable ? 'hover:bg-white/5' : ''}`}
                      style={{ width: GRID_CELL_WIDTH, padding: 2 }}
                      onMouseDown={(e) => handleCellMouseDown(e, inst, step)}
                      onDoubleClick={(e) => handleCellDoubleClick(e, inst, step)}
                      onMouseEnter={() => setHoveredCell({ inst, step })}
                    >
                      <div className={`absolute inset-0.5 rounded-sm ${note ? '' : 'bg-white/[0.02]'
                        } ${isHovered && !note && editable ? 'bg-white/10 border border-dashed border-white/20' : ''}`} />

                      {note && (
                        <div
                          className={`absolute top-0.5 left-0.5 bottom-0.5 rounded-sm bg-[var(--accent-primary)] transition-all ${isSelected ? 'ring-2 ring-[var(--accent-secondary)]' : ''
                            } ${editable ? 'hover:brightness-125' : ''}`}
                          style={{
                            width: noteWidth - 4,
                            opacity: 0.3 + velocity * 0.7,
                            boxShadow: `0 0 ${velocity * 15}px var(--glow-primary)`,
                          }}
                        />
                      )}

                      {isActive && (
                        <div className={`absolute inset-0 rounded-sm ${note ? 'ring-2 ring-white/60' : 'bg-white/10'
                          }`} />
                      )}

                      {isDragging && tempVelocity !== null && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5 text-[9px] font-mono text-[var(--accent-primary)] whitespace-nowrap z-30">
                          {Math.round(tempVelocity * 100)}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部提示 - 绝对定位 */}
      {editable && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-[var(--text-muted)] font-mono opacity-60 bg-[var(--bg-primary)] px-4 py-1 rounded">
          单击=添加 | 上下拖动=调力度 | 双击=删除 | Shift+单击=多选
        </div>
      )}
    </div>
  );
});

export default Visualizer;