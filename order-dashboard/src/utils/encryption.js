const IV_LENGTH = 12;

function getEncryptionKey() {
  const encodedKey = import.meta.env.VITE_AES_KEY;

  if (!encodedKey) {
    throw new Error("Encryption key is not configured");
  }

  const binary = atob(encodedKey);

  const keyBytes = Uint8Array.from(
    binary,
    (character) => character.charCodeAt(0)
  );

  if (![16, 24, 32].includes(keyBytes.length)) {
    throw new Error("AES key must be 16, 24, or 32 bytes");
  }

  return keyBytes;
}

function toBase64(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);

  return Uint8Array.from(
    binary,
    (character) => character.charCodeAt(0)
  );
}

export async function encryptData(plainText) {
  const keyBytes = getEncryptionKey();

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(
    new Uint8Array(IV_LENGTH)
  );

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128,
    },
    key,
    new TextEncoder().encode(plainText)
  );

  // Web Crypto returns ciphertext followed by the 16-byte GCM tag.
  const combined = new Uint8Array(
    iv.length + encrypted.byteLength
  );

  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return toBase64(combined);
}

export async function decryptData(encryptedText) {
  const keyBytes = getEncryptionKey();
  const combined = fromBase64(encryptedText);

  if (combined.length <= IV_LENGTH + 16) {
    throw new Error("Invalid encrypted response");
  }

  const iv = combined.slice(0, IV_LENGTH);
  const encrypted = combined.slice(IV_LENGTH);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128,
    },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}