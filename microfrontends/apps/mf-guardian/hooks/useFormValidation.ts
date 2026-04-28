import { useState, useCallback } from 'react';

export interface ValidationRule {
    required?: boolean;
    email?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
}

export interface FieldConfig {
    [key: string]: ValidationRule;
}

export interface FormErrors {
    [key: string]: string;
}

export interface FormData {
    [key: string]: any;
}

export const useFormValidation = (fieldConfig: FieldConfig, initialData: FormData = {}) => {
    const [data, setData] = useState<FormData>(initialData);
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

    const validateField = useCallback((name: string, value: any): string => {
        const rules = fieldConfig[name];
        if (!rules) return '';

        // Required validation
        if (rules.required && (!value || value.toString().trim() === '')) {
            return 'Este campo es obligatorio';
        }

        // Skip other validations if field is empty and not required
        if (!value || value.toString().trim() === '') {
            return '';
        }

        // Email validation
        if (rules.email) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(value)) {
                return 'Ingrese un email válido';
            }
        }

        // Min length validation
        if (rules.minLength && value.toString().length < rules.minLength) {
            return `Debe tener al menos ${rules.minLength} caracteres`;
        }

        // Max length validation
        if (rules.maxLength && value.toString().length > rules.maxLength) {
            return `No puede tener más de ${rules.maxLength} caracteres`;
        }

        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value)) {
            return 'Formato inválido';
        }

        // Custom validation
        if (rules.custom) {
            const customError = rules.custom(value);
            if (customError) return customError;
        }

        return '';
    }, [fieldConfig]);

    const validateForm = useCallback((): boolean => {
        const newErrors: FormErrors = {};
        let isValid = true;

        Object.keys(fieldConfig).forEach(fieldName => {
            const error = validateField(fieldName, data[fieldName]);
            if (error) {
                newErrors[fieldName] = error;
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    }, [data, fieldConfig, validateField]);

    const updateField = useCallback((name: string, value: any) => {
        setData(prev => ({ ...prev, [name]: value }));
        
        // Validate field if it has been touched
        if (touched[name]) {
            const error = validateField(name, value);
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    }, [touched, validateField]);

    const touchField = useCallback((name: string) => {
        setTouched(prev => ({ ...prev, [name]: true }));
        
        // Validate the field when it's touched
        const error = validateField(name, data[name]);
        setErrors(prev => ({ ...prev, [name]: error }));
    }, [data, validateField]);

    const resetForm = useCallback((newData: FormData = {}) => {
        setData(newData);
        setErrors({});
        setTouched({});
    }, []);

    const setFieldError = useCallback((name: string, error: string) => {
        setErrors(prev => ({ ...prev, [name]: error }));
    }, []);

    return {
        data,
        errors,
        touched,
        updateField,
        touchField,
        validateForm,
        resetForm,
        setFieldError,
        isValid: Object.keys(errors).length === 0
    };
};