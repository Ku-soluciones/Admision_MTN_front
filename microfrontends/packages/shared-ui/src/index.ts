// Paquete compartido entre todos los MFs.
// Cada modulo se exporta con su path completo para que los re-exports
// en mf-* (e.g. mf-admin/types/document.ts) apunten directamente al archivo
// equivalente aqui (e.g. shared-ui/src/types/document.ts), preservando el
// API publico previo a la consolidacion.
//
// No anadir "barrels" aqui: los consumidores siguen importando por path
// individual, igual que antes.
export {};

