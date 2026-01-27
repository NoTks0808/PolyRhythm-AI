import { useCallback, useReducer } from 'react';

/**
 * 通用历史记录 Hook，支持撤销/重做
 */

interface HistoryState<T> {
    past: T[];
    present: T;
    future: T[];
}

type HistoryAction<T> =
    | { type: 'SET'; newPresent: T }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'CLEAR'; initialPresent: T };

function historyReducer<T>(state: HistoryState<T>, action: HistoryAction<T>): HistoryState<T> {
    const { past, present, future } = state;

    switch (action.type) {
        case 'SET': {
            if (action.newPresent === present) return state;
            return {
                past: [...past, present].slice(-50), // 限制历史长度
                present: action.newPresent,
                future: [],
            };
        }
        case 'UNDO': {
            if (past.length === 0) return state;
            const previous = past[past.length - 1];
            const newPast = past.slice(0, -1);
            return {
                past: newPast,
                present: previous,
                future: [present, ...future],
            };
        }
        case 'REDO': {
            if (future.length === 0) return state;
            const next = future[0];
            const newFuture = future.slice(1);
            return {
                past: [...past, present],
                present: next,
                future: newFuture,
            };
        }
        case 'CLEAR': {
            return {
                past: [],
                present: action.initialPresent,
                future: [],
            };
        }
        default:
            return state;
    }
}

export interface UseHistoryReturn<T> {
    state: T;
    set: (newState: T | ((prev: T) => T)) => void;
    undo: () => void;
    redo: () => void;
    clear: (newInitial?: T) => void;
    canUndo: boolean;
    canRedo: boolean;
}

export function useHistory<T>(initialState: T): UseHistoryReturn<T> {
    const [history, dispatch] = useReducer(historyReducer<T>, {
        past: [],
        present: initialState,
        future: [],
    });

    const set = useCallback((newState: T | ((prev: T) => T)) => {
        const resolved = typeof newState === 'function'
            ? (newState as (prev: T) => T)(history.present)
            : newState;
        dispatch({ type: 'SET', newPresent: resolved });
    }, [history.present]);

    const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
    const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
    const clear = useCallback((newInitial?: T) => {
        dispatch({ type: 'CLEAR', initialPresent: newInitial ?? history.present });
    }, [history.present]);

    return {
        state: history.present,
        set,
        undo,
        redo,
        clear,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
    };
}
