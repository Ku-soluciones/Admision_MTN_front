import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutoSaveOptions<T> {
    key: string;
    data: T;
    interval?: number; // milliseconds, default 30000 (30 seconds)
    enabled?: boolean;
}

interface UseAutoSaveReturn {
    lastSaved: Date | null;
    isSaving: boolean;
    hasDraft: boolean;
    draftAge: number | null; // milliseconds since last save
    restoreDraft: () => T | null;
    clearDraft: () => void;
    saveNow: () => void;
}

export function useAutoSave<T>({
    key,
    data,
    interval = 30000,
    enabled = true
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasDraft, setHasDraft] = useState(false);
    const [draftAge, setDraftAge] = useState<number | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dataRef = useRef<T>(data);

    // Keep data ref updated
    dataRef.current = data;

    // Check for existing draft on mount
    useEffect(() => {
        const storageKey = `draft_${key}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            setHasDraft(true);
            try {
                const parsed = JSON.parse(saved);
                if (parsed.timestamp) {
                    setDraftAge(Date.now() - parsed.timestamp);
                }
            } catch {
                // ignore parse errors
            }
        }
    }, [key]);

    // Save to localStorage
    const saveDraft = useCallback(() => {
        const storageKey = `draft_${key}`;
        const payload = {
            data: dataRef.current,
            timestamp: Date.now()
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        setLastSaved(new Date());
        setHasDraft(true);
        setDraftAge(null);
    }, [key]);

    // Auto-save effect
    useEffect(() => {
        if (!enabled) return;

        timeoutRef.current = setTimeout(() => {
            setIsSaving(true);
            saveDraft();
            setIsSaving(false);
        }, interval);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, interval, enabled, saveDraft]);

    // Restore draft from localStorage
    const restoreDraft = useCallback((): T | null => {
        const storageKey = `draft_${key}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.data as T;
            } catch {
                return null;
            }
        }
        return null;
    }, [key]);

    // Clear draft from localStorage
    const clearDraft = useCallback(() => {
        const storageKey = `draft_${key}`;
        localStorage.removeItem(storageKey);
        setHasDraft(false);
        setDraftAge(null);
    }, [key]);

    // Save immediately
    const saveNow = useCallback(() => {
        setIsSaving(true);
        saveDraft();
        setIsSaving(false);
    }, [saveDraft]);

    return {
        lastSaved,
        isSaving,
        hasDraft,
        draftAge,
        restoreDraft,
        clearDraft,
        saveNow
    };
}

export default useAutoSave;
