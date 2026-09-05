const CryptoJS = require('crypto-js');

const KEY = process.env.ENCRYPTION_KEY || 'arb_softech_aes256_key_32chars!!';

function encrypt(text) {
  if (!text) return null;
  return CryptoJS.AES.encrypt(String(text), KEY).toString();
}

function decrypt(cipherText) {
  if (!cipherText) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return null;
  }
}

module.exports = { encrypt, decrypt };
