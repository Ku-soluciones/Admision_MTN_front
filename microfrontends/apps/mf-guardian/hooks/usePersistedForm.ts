import { useEffect } from 'react';
import { useFormValidation, FieldConfig, FormData } from './useFormValidation';
import { useLocalStorage } from './useLocalStorage';

export const usePersistedForm = (
    fieldConfig: FieldConfig, 
    initialData: FormData = {},
    storageKey: string = 'form_data'
) => {
    const [persistedData, setPersistedData] = useLocalStorage<FormData>(storageKey, initialData);
    
    const formHook = useFormValidation(fieldConfig, persistedData);

    // Persist form data whenever it changes
    useEffect(() => {
        if (Object.keys(formHook.data).length > 0) {
            setPersistedData(formHook.data);
        }
    }, [formHook.data, setPersistedData]);

    const clearPersistedData = () => {
        setPersistedData({});
        formHook.resetForm();
    };

    return {
        ...formHook,
        clearPersistedData
    };
};