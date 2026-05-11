// Re-export desde paquete compartido (single source of truth)
// Fuente: microfrontends/packages/shared-ui/src/context/AuthContext.tsx
export * from '../../../packages/shared-ui/src/context/AuthContext';

// NOTA: Este archivo usa el AuthContext centralizado de shared-ui para
// garantizar consistencia entre todos los microfrontends.
// Las correcciones de race conditions y session handling se aplican
// en el shared-ui/src/context/AuthContext.tsx
