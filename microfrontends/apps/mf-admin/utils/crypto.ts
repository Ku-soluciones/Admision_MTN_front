/**
 * Utilidad de encriptación híbrida RSA + AES para el frontend
 * Encripta credenciales sensibles antes de enviarlas al backend
 */

// Tipos para la información de la clave pública
export interface PublicKeyInfo {
  publicKey: string;
  keyId: string;
  algorithm: string;
  keySize: number;
  hash: string;
  expiresIn: number;
}

// Tipos para el payload encriptado
export interface EncryptedPayload {
  encryptedData: string;
  encryptedKey: string;
  iv: string;
  authTag: string;
}

/**
 * Convierte un string PEM a ArrayBuffer
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');

  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

/**
 * Convierte ArrayBuffer a string base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

/**
 * Importa una clave pública RSA desde formato PEM
 */
async function importPublicKey(pemKey: string): Promise<CryptoKey> {
  const keyData = pemToArrayBuffer(pemKey);

  return await window.crypto.subtle.importKey(
    'spki',
    keyData,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['encrypt']
  );
}

/**
 * Genera una clave AES-256-GCM aleatoria
 */
async function generateAESKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encripta datos usando AES-256-GCM
 */
async function encryptWithAES(
  aesKey: CryptoKey,
  data: string
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array; authTag: Uint8Array }> {
  // Generar IV aleatorio (12 bytes para GCM)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Convertir datos a ArrayBuffer
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Encriptar con AES-GCM
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128 // 16 bytes auth tag
    },
    aesKey,
    dataBuffer
  );

  // AES-GCM incluye el auth tag al final del ciphertext
  // Separar ciphertext y auth tag
  const ciphertext = encrypted.slice(0, encrypted.byteLength - 16);
  const authTag = new Uint8Array(encrypted.slice(encrypted.byteLength - 16));

  return {
    encrypted: ciphertext,
    iv,
    authTag
  };
}

/**
 * Encripta la clave AES con la clave pública RSA
 */
async function encryptAESKeyWithRSA(
  rsaPublicKey: CryptoKey,
  aesKey: CryptoKey
): Promise<ArrayBuffer> {
  // Exportar clave AES como raw bytes
  const aesKeyData = await window.crypto.subtle.exportKey('raw', aesKey);

  // Encriptar con RSA-OAEP
  return await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP'
    },
    rsaPublicKey,
    aesKeyData
  );
}

/**
 * Encripta credenciales usando encriptación híbrida RSA + AES
 *
 * @param credentials - Objeto con las credenciales a encriptar
 * @param publicKeyInfo - Información de la clave pública del servidor
 * @returns Payload encriptado listo para enviar al backend
 */
export async function encryptCredentials(
  credentials: Record<string, any>,
  publicKeyInfo: PublicKeyInfo
): Promise<EncryptedPayload> {
  try {
    // 1. Importar clave pública RSA
    const rsaPublicKey = await importPublicKey(publicKeyInfo.publicKey);

    // 2. Generar clave AES aleatoria
    const aesKey = await generateAESKey();

    // 3. Encriptar credenciales con AES
    const credentialsJSON = JSON.stringify(credentials);
    const { encrypted, iv, authTag } = await encryptWithAES(aesKey, credentialsJSON);

    // 4. Encriptar clave AES con RSA
    const encryptedAESKey = await encryptAESKeyWithRSA(rsaPublicKey, aesKey);

    // 5. Convertir todo a base64
    return {
      encryptedData: arrayBufferToBase64(encrypted),
      encryptedKey: arrayBufferToBase64(encryptedAESKey),
      iv: arrayBufferToBase64(iv),
      authTag: arrayBufferToBase64(authTag)
    };
  } catch (error) {
    console.error('[Encryption] Error encrypting credentials:', error);
    throw new Error('Failed to encrypt credentials');
  }
}

/**
 * Verifica si el navegador soporta la API de Web Crypto
 */
export function isEncryptionSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.crypto &&
    window.crypto.subtle &&
    typeof window.crypto.subtle.encrypt === 'function'
  );
}

/**
 * Obtiene la clave pública del servidor
 *
 * @param baseURL - URL base del servidor (ej: http://localhost:8082)
 * @returns Información de la clave pública
 */
export async function getPublicKey(baseURL: string): Promise<PublicKeyInfo> {
  try {
    const response = await fetch(`${baseURL}/v1/auth/public-key`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error('Invalid public key response');
    }

    return data.data as PublicKeyInfo;
  } catch (error) {
    console.error('[Encryption] Error fetching public key:', error);
    throw new Error('Failed to fetch public key from server');
  }
}

// Cache para la clave pública (evitar múltiples requests)
let cachedPublicKey: PublicKeyInfo | null = null;
let cacheExpiry: number = 0;

/**
 * Obtiene la clave pública con cache
 * La clave se re-obtiene cuando está por expirar (5 min antes)
 */
export async function getCachedPublicKey(baseURL: string): Promise<PublicKeyInfo> {
  const now = Date.now() / 1000; // segundos

  // Si no hay cache o está por expirar (5 min antes)
  if (!cachedPublicKey || now >= cacheExpiry - 300) {
    cachedPublicKey = await getPublicKey(baseURL);
    cacheExpiry = now + cachedPublicKey.expiresIn;
    console.log('[Encryption] Public key cached, expires in:', cachedPublicKey.expiresIn, 'seconds');
  }

  return cachedPublicKey;
}

/**
 * Limpia el cache de la clave pública
 */
export function clearPublicKeyCache(): void {
  cachedPublicKey = null;
  cacheExpiry = 0;
}
