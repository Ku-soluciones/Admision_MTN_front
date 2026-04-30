import React, { createContext, useContext, useReducer, ReactNode, useEffect, useCallback } from 'react';
import { Application, ApplicationStatus } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface AppState {
    applications: Application[];
    currentUser: {
        id: string;
        email: string;
        role: 'admin' | 'family';
        isAuthenticated: boolean;
    } | null;
    loading: boolean;
    error: string | null;
    notifications: Notification[];
}

interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
}

type AppAction = 
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_APPLICATIONS'; payload: Application[] }
    | { type: 'ADD_APPLICATION'; payload: Application }
    | { type: 'UPDATE_APPLICATION'; payload: { id: string; updates: Partial<Application> } }
    | { type: 'SET_USER'; payload: AppState['currentUser'] }
    | { type: 'LOGOUT' }
    | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'timestamp' | 'read'> }
    | { type: 'MARK_NOTIFICATION_READ'; payload: string }
    | { type: 'CLEAR_NOTIFICATIONS' };

const initialState: AppState = {
    applications: [],
    currentUser: null,
    loading: false,
    error: null,
    notifications: []
};

const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        
        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false };
        
        case 'SET_APPLICATIONS':
            return { ...state, applications: action.payload };
        
        case 'ADD_APPLICATION':
            return { 
                ...state, 
                applications: [...state.applications, action.payload] 
            };
        
        case 'UPDATE_APPLICATION':
            return {
                ...state,
                applications: state.applications.map(app =>
                    app.id === action.payload.id 
                        ? { ...app, ...action.payload.updates }
                        : app
                )
            };
        
        case 'SET_USER':
            return { ...state, currentUser: action.payload };
        
        case 'LOGOUT':
            return { ...state, currentUser: null };
        
        case 'ADD_NOTIFICATION':
            const newNotification: Notification = {
                ...action.payload,
                id: Date.now().toString(),
                timestamp: new Date(),
                read: false
            };
            return {
                ...state,
                notifications: [newNotification, ...state.notifications]
            };
        
        case 'MARK_NOTIFICATION_READ':
            return {
                ...state,
                notifications: state.notifications.map(notif =>
                    notif.id === action.payload 
                        ? { ...notif, read: true }
                        : notif
                )
            };
        
        case 'CLEAR_NOTIFICATIONS':
            return { ...state, notifications: [] };
        
        default:
            return state;
    }
};

const AppContext = createContext<{
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
} | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const [persistedApplications, setPersistedApplications] = useLocalStorage<Application[]>('mtn_applications', []);
    const [persistedUser, setPersistedUser] = useLocalStorage<AppState['currentUser']>('mtn_user', null);

    // Load persisted data on mount
    useEffect(() => {
        if (persistedApplications.length > 0) {
            dispatch({ type: 'SET_APPLICATIONS', payload: persistedApplications });
        }
        if (persistedUser) {
            dispatch({ type: 'SET_USER', payload: persistedUser });
        }
    }, []);

    // Persist data when state changes
    useEffect(() => {
        if (state.applications.length > 0) {
            setPersistedApplications(state.applications);
        }
    }, [state.applications, setPersistedApplications]);

    useEffect(() => {
        setPersistedUser(state.currentUser);
    }, [state.currentUser, setPersistedUser]);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

// Helper hooks for common operations
export const useApplications = () => {
    const { state, dispatch } = useAppContext();
    
    const addApplication = (application: Application) => {
        dispatch({ type: 'ADD_APPLICATION', payload: application });
    };
    
    const updateApplication = (id: string, updates: Partial<Application>) => {
        dispatch({ type: 'UPDATE_APPLICATION', payload: { id, updates } });
    };
    
    return {
        applications: state.applications,
        addApplication,
        updateApplication
    };
};

export const useAuth = () => {
    const { state, dispatch } = useAppContext();
    
    const login = (user: AppState['currentUser']) => {
        dispatch({ type: 'SET_USER', payload: user });
    };
    
    const logout = () => {
        dispatch({ type: 'LOGOUT' });
    };
    
    return {
        user: state.currentUser,
        isAuthenticated: state.currentUser?.isAuthenticated || false,
        login,
        logout
    };
};

export const useNotifications = () => {
    const { state, dispatch } = useAppContext();

    const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
    }, [dispatch]);

    const markAsRead = useCallback((id: string) => {
        dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
    }, [dispatch]);

    const clearAll = useCallback(() => {
        dispatch({ type: 'CLEAR_NOTIFICATIONS' });
    }, [dispatch]);

    return {
        notifications: state.notifications,
        unreadCount: state.notifications.filter(n => !n.read).length,
        addNotification,
        markAsRead,
        clearAll
    };
};