// End-to-end encryption utilities for private messaging

class E2EEncryption {
  private static async generateKeyPair(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  private static async generateSymmetricKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  static async initializeKeys(): Promise<{publicKey: string, privateKey: string}> {
    const keyPair = await this.generateKeyPair();
    
    const publicKeyExported = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKeyExported = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    
    return {
      publicKey: this.arrayBufferToBase64(publicKeyExported),
      privateKey: this.arrayBufferToBase64(privateKeyExported)
    };
  }

  static async encryptMessage(message: string, recipientPublicKey: string): Promise<{encryptedData: string, iv: string}> {
    // Generate symmetric key for this message
    const symmetricKey = await this.generateSymmetricKey();
    
    // Encrypt message with symmetric key
    const encoder = new TextEncoder();
    const messageData = encoder.encode(message);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedMessage = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      symmetricKey,
      messageData
    );

    // Export symmetric key
    const symmetricKeyData = await window.crypto.subtle.exportKey('raw', symmetricKey);
    
    // Import recipient's public key
    const publicKeyBuffer = this.base64ToArrayBuffer(recipientPublicKey);
    const importedPublicKey = await window.crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ['encrypt']
    );

    // Encrypt symmetric key with recipient's public key
    const encryptedSymmetricKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      importedPublicKey,
      symmetricKeyData
    );

    // Combine encrypted symmetric key + encrypted message
    const combinedData = new Uint8Array(encryptedSymmetricKey.byteLength + encryptedMessage.byteLength);
    combinedData.set(new Uint8Array(encryptedSymmetricKey), 0);
    combinedData.set(new Uint8Array(encryptedMessage), encryptedSymmetricKey.byteLength);

    return {
      encryptedData: this.arrayBufferToBase64(combinedData.buffer),
      iv: this.arrayBufferToBase64(iv.buffer)
    };
  }

  static async decryptMessage(encryptedData: string, iv: string, privateKey: string): Promise<string> {
    try {
      // Import private key
      const privateKeyBuffer = this.base64ToArrayBuffer(privateKey);
      const importedPrivateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ['decrypt']
      );

      // Parse encrypted data
      const dataBuffer = this.base64ToArrayBuffer(encryptedData);
      const encryptedSymmetricKey = dataBuffer.slice(0, 256); // RSA-2048 produces 256 byte encrypted data
      const encryptedMessage = dataBuffer.slice(256);

      // Decrypt symmetric key
      const symmetricKeyData = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        importedPrivateKey,
        encryptedSymmetricKey
      );

      // Import symmetric key
      const symmetricKey = await window.crypto.subtle.importKey(
        'raw',
        symmetricKeyData,
        { name: "AES-GCM" },
        false,
        ['decrypt']
      );

      // Decrypt message
      const ivBuffer = this.base64ToArrayBuffer(iv);
      const decryptedMessage = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
        symmetricKey,
        encryptedMessage
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedMessage);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[Message could not be decrypted]';
    }
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export default E2EEncryption;