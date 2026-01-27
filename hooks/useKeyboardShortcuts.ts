import { useEffect, useCallback } from 'react';

interface KeyboardShortcuts {
    onUndo?: () => void;
    onRedo?: () => void;
    onDelete?: () => void;
    onTogglePlay?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
}

/**
 * 全局键盘快捷键 Hook
 */
export function useKeyboardShortcuts({
    onUndo,
    onRedo,
    onDelete,
    onTogglePlay,
    canUndo = true,
    canRedo = true,
}: KeyboardShortcuts) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // 忽略输入框内的按键
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        // Ctrl/Cmd + Z = Undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            if (canUndo && onUndo) {
                onUndo();
            }
            return;
        }

        // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z = Redo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            if (canRedo && onRedo) {
                onRedo();
            }
            return;
        }

        // Delete or Backspace = Delete selected
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            if (onDelete) {
                onDelete();
            }
            return;
        }

        // Space = Toggle play
        if (e.key === ' ') {
            e.preventDefault();
            if (onTogglePlay) {
                onTogglePlay();
            }
            return;
        }
    }, [onUndo, onRedo, onDelete, onTogglePlay, canUndo, canRedo]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
