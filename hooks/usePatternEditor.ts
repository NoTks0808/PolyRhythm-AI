import { useCallback, useMemo } from 'react';
import { GeneratedPattern, DrumNote, DrumInstrument } from '../types';
import { useHistory } from './useHistory';

/**
 * 生成唯一 Note ID
 */
const generateNoteId = (instrument: DrumInstrument, step: number): string => {
    return `${instrument}_${step}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
};

/**
 * 为现有 pattern 的 notes 添加 ID（如果没有的话）
 */
export const ensureNoteIds = (pattern: GeneratedPattern | null): GeneratedPattern | null => {
    if (!pattern) return null;

    const notesWithIds = pattern.notes.map((note, index) => ({
        ...note,
        id: note.id || `${note.instrument}_${note.step}_${index}`,
    }));

    return { ...pattern, notes: notesWithIds };
};

export interface UsePatternEditorReturn {
    // State
    pattern: GeneratedPattern | null;
    selectedNoteIds: Set<string>;

    // Actions
    setPattern: (pattern: GeneratedPattern | null) => void;
    addNote: (instrument: DrumInstrument, step: number, velocity?: number) => void;
    deleteNote: (noteId: string) => void;
    deleteNoteAt: (instrument: DrumInstrument, step: number) => void;
    updateNoteVelocity: (noteId: string, velocity: number) => void;
    moveNote: (noteId: string, newStep: number, newInstrument: DrumInstrument) => void;

    // Selection
    selectNote: (noteId: string, addToSelection?: boolean) => void;
    clearSelection: () => void;
    deleteSelected: () => void;

    // History
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export function usePatternEditor(initialPattern: GeneratedPattern | null = null): UsePatternEditorReturn {
    const patternWithIds = useMemo(() => ensureNoteIds(initialPattern), [initialPattern]);

    const {
        state: pattern,
        set: setPatternInternal,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useHistory<GeneratedPattern | null>(patternWithIds);

    // Selection state (not part of history)
    const [selectedNoteIds, setSelectedNoteIds] = React.useState<Set<string>>(new Set());

    // 外部设置 pattern（如 AI 生成后）
    const setPattern = useCallback((newPattern: GeneratedPattern | null) => {
        const withIds = ensureNoteIds(newPattern);
        setPatternInternal(withIds);
        setSelectedNoteIds(new Set()); // 清空选择
    }, [setPatternInternal]);

    // 添加音符
    const addNote = useCallback((instrument: DrumInstrument, step: number, velocity = 0.8) => {
        if (!pattern) return;

        // 检查是否已有音符在该位置
        const existingNote = pattern.notes.find(n => n.instrument === instrument && n.step === step);
        if (existingNote) return; // 已存在则不添加

        const newNote: DrumNote = {
            id: generateNoteId(instrument, step),
            instrument,
            step,
            velocity: Math.max(0.1, Math.min(1, velocity)),
            duration: 2,  // 默认16分音符长度（2个32分音符）
        };

        setPatternInternal({
            ...pattern,
            notes: [...pattern.notes, newNote],
        });
    }, [pattern, setPatternInternal]);

    // 通过 ID 删除音符
    const deleteNote = useCallback((noteId: string) => {
        if (!pattern) return;

        setPatternInternal({
            ...pattern,
            notes: pattern.notes.filter(n => n.id !== noteId),
        });

        // 从选择中移除
        setSelectedNoteIds(prev => {
            const next = new Set(prev);
            next.delete(noteId);
            return next;
        });
    }, [pattern, setPatternInternal]);

    // 通过位置删除音符
    const deleteNoteAt = useCallback((instrument: DrumInstrument, step: number) => {
        if (!pattern) return;

        const noteToDelete = pattern.notes.find(n => n.instrument === instrument && n.step === step);
        if (noteToDelete) {
            deleteNote(noteToDelete.id);
        }
    }, [pattern, deleteNote]);

    // 更新音符力度
    const updateNoteVelocity = useCallback((noteId: string, velocity: number) => {
        if (!pattern) return;

        const clampedVelocity = Math.max(0.1, Math.min(1, velocity));

        setPatternInternal({
            ...pattern,
            notes: pattern.notes.map(n =>
                n.id === noteId ? { ...n, velocity: clampedVelocity } : n
            ),
        });
    }, [pattern, setPatternInternal]);

    // 移动音符
    const moveNote = useCallback((noteId: string, newStep: number, newInstrument: DrumInstrument) => {
        if (!pattern) return;

        // 检查目标位置是否已有音符
        const targetExists = pattern.notes.some(
            n => n.id !== noteId && n.instrument === newInstrument && n.step === newStep
        );
        if (targetExists) return; // 目标位置已有音符

        // 边界检查
        if (newStep < 0 || newStep >= pattern.totalSteps) return;

        setPatternInternal({
            ...pattern,
            notes: pattern.notes.map(n =>
                n.id === noteId ? { ...n, step: newStep, instrument: newInstrument } : n
            ),
        });
    }, [pattern, setPatternInternal]);

    // 选择音符
    const selectNote = useCallback((noteId: string, addToSelection = false) => {
        setSelectedNoteIds(prev => {
            if (addToSelection) {
                const next = new Set(prev);
                if (next.has(noteId)) {
                    next.delete(noteId);
                } else {
                    next.add(noteId);
                }
                return next;
            }
            return new Set([noteId]);
        });
    }, []);

    // 清空选择
    const clearSelection = useCallback(() => {
        setSelectedNoteIds(new Set());
    }, []);

    // 删除所有选中的音符
    const deleteSelected = useCallback(() => {
        if (!pattern || selectedNoteIds.size === 0) return;

        setPatternInternal({
            ...pattern,
            notes: pattern.notes.filter(n => !selectedNoteIds.has(n.id)),
        });

        setSelectedNoteIds(new Set());
    }, [pattern, selectedNoteIds, setPatternInternal]);

    return {
        pattern,
        selectedNoteIds,
        setPattern,
        addNote,
        deleteNote,
        deleteNoteAt,
        updateNoteVelocity,
        moveNote,
        selectNote,
        clearSelection,
        deleteSelected,
        undo,
        redo,
        canUndo,
        canRedo,
    };
}

// 需要导入 React（用于 useState）
import React from 'react';
