// Paquete compartido entre los módulos de la app.
// Cada modulo se exporta con su path completo para que los re-exports
// en feature-* (e.g. admin/types/document.ts) apunten directamente al archivo
// equivalente aqui (e.g. shared-ui/src/types/document.ts), preservando el
// API publico previo a la consolidacion.
//
// No anadir "barrels" aqui: los consumidores siguen importando por path
// individual, igual que antes.
export {};
