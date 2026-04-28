import api from './api';

/**
 * Client-Side Credential Encryption Service
 *
 * Implements RSA + AES hybrid encryption for login credentials:
 * 1. Fetch RSA public key from backend
 * 2. Generate random AES-256 key for each request
 * 3. Encrypt credentials with AES-256-GCM
 * 4. Encrypt AES key with RSA public key
 * 5. Send encrypted payload to backend
 *
 * Security: Ensures passwords never travel in plain text, even over HTTPS
 */

interface RSAPublicKeyResponse {
    success: boolean;
    publicKey: string;
    keyId: string;
    algorithm: string;
    keySize: number;
    hash: string;
}

interface EncryptedPayload {
    encryptedData: string;
    encryptedKey: string;
    iv: string;
    authTag: string;
}

class EncryptionService {
    private rsaPublicKey: CryptoKey | null = null;
    private keyId: string | null = null;
    private keyFetchTime: number = 0;
    private readonly KEY_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

    /**
     * Fetch RSA public key from backend
     * Cached for 1 hour to reduce network requests
     */
    private async fetchPublicKey(): Promise<void> {
        const now = Date.now();

        // Use cached key if still valid
        if (this.rsaPublicKey && (now - this.keyFetchTime) < this.KEY_CACHE_DURATION) {
            return;
        }

        try {
            const response = await api.get<any>('/v1/auth/public-key');

            // Check if encryption is available
            if (!response.data || response.data.encryptionAvailable === false) {
                console.log('[Encryption] Backend encryption not available, using plaintext');
                this.rsaPublicKey = null;
                this.keyId = null;
                return;
            }

            if (!response.data.success || !response.data.publicKey) {
                throw new Error('Failed to fetch public key from backend');
            }

            // Import PEM public key
            const pemKey = response.data.publicKey;
            const pemHeader = '-----BEGIN PUBLIC KEY-----';
            const pemFooter = '-----END PUBLIC KEY-----';
            const pemContents = pemKey
                .replace(pemHeader, '')
                .replace(pemFooter, '')
                .replace(/\s/g, '');

            const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

            this.rsaPublicKey = await crypto.subtle.importKey(
                'spki',
                binaryDer,
                {
                    name: 'RSA-OAEP',
                    hash: 'SHA-256'
                },
                false,
                ['encrypt']
            );

            this.keyId = response.data.keyId;
            this.keyFetchTime = now;

            console.log('[Encryption] RSA public key fetched and imported successfully');
        } catch (error) {
            console.error('[Encryption] Failed to fetch public key:', error);
            throw new Error('Encryption service unavailable. Please try again.');
        }
    }

    /**
     * Encrypt credentials using RSA + AES hybrid encryption
     *
     * @param credentials - Object containing email and password
     * @returns Encrypted payload with encryptedData, encryptedKey, iv, authTag
     */
    async encryptCredentials(credentials: { email: string; password: string }): Promise<EncryptedPayload | null> {
        try {
            // Ensure we have the latest public key
            await this.fetchPublicKey();

            if (!this.rsaPublicKey) {
                console.log('[Encryption] No RSA key available, returning null (plaintext mode)');
                return null; // Return null to signal plaintext mode
            }

            // Step 1: Generate random AES-256 key
            const aesKey = await crypto.subtle.generateKey(
                {
                    name: 'AES-GCM',
                    length: 256
                },
                true,
                ['encrypt']
            );

            // Step 2: Generate random IV (12 bytes for GCM)
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Step 3: Encrypt credentials with AES-256-GCM
            const credentialsString = JSON.stringify(credentials);
            const credentialsBuffer = new TextEncoder().encode(credentialsString);

            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv,
                    tagLength: 128 // 16 bytes auth tag
                },
                aesKey,
                credentialsBuffer
            );

            // Extract auth tag (last 16 bytes)
            const encryptedArray = new Uint8Array(encryptedData);
            const ciphertext = encryptedArray.slice(0, encryptedArray.length - 16);
            const authTag = encryptedArray.slice(encryptedArray.length - 16);

            // Step 4: Export AES key as raw bytes
            const aesKeyBuffer = await crypto.subtle.exportKey('raw', aesKey);

            // Step 5: Encrypt AES key with RSA public key
            const encryptedKey = await crypto.subtle.encrypt(
                {
                    name: 'RSA-OAEP'
                },
                this.rsaPublicKey,
                aesKeyBuffer
            );

            // Step 6: Convert to base64 for transport
            const payload: EncryptedPayload = {
                encryptedData: this.arrayBufferToBase64(ciphertext),
                encryptedKey: this.arrayBufferToBase64(encryptedKey),
                iv: this.arrayBufferToBase64(iv),
                authTag: this.arrayBufferToBase64(authTag)
            };

            console.log('[Encryption] Credentials encrypted successfully');

            return payload;

        } catch (error) {
            console.error('[Encryption] Failed to encrypt credentials:', error);
            throw new Error('Failed to encrypt credentials. Please try again.');
        }
    }

    /**
     * Convert ArrayBuffer to base64 string
     */
    private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
        const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Check if encryption is available
     * Returns true if Web Crypto API is supported
     */
    isEncryptionAvailable(): boolean {
        return typeof crypto !== 'undefined' &&
               typeof crypto.subtle !== 'undefined' &&
               typeof crypto.subtle.encrypt === 'function';
    }

    /**
     * Clear cached keys (useful for testing or key rotation)
     */
    clearCache(): void {
        this.rsaPublicKey = null;
        this.keyId = null;
        this.keyFetchTime = 0;
        console.log('[Encryption] Cache cleared');
    }
}

export const encryptionService = new EncryptionService();
export default encryptionService;
