import * as SecureStore from "expo-secure-store";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
import { supabase } from "./supabase";

// Type for key pair
export type KeyPair = {
  privateKeyBase64: string;
  publicKeyBase64: string;
};

/**
 * Get existing key pair from SecureStore or create a new one
 */
export const getOrCreateKeys = async (senderPhone: string): Promise<KeyPair> => {
  let privateKeyBase64 = await SecureStore.getItemAsync("privateKey");
  let publicKeyBase64 = await SecureStore.getItemAsync("publicKey");

  if (!privateKeyBase64 || !publicKeyBase64) {
    const keyPair = nacl.box.keyPair();
    privateKeyBase64 = naclUtil.encodeBase64(keyPair.secretKey);
    publicKeyBase64 = naclUtil.encodeBase64(keyPair.publicKey);

    await SecureStore.setItemAsync("privateKey", privateKeyBase64);
    await SecureStore.setItemAsync("publicKey", publicKeyBase64);

    // Upload publicKey to Supabase profiles table
    await supabase
      .from("profiles")
      .update({ public_key: publicKeyBase64 })
      .eq("phone_number", senderPhone);
  }

  return { privateKeyBase64, publicKeyBase64 };
};

/**
 * Encrypt a message for recipient
 */
export const encryptMessage = (
  message: string,
  recipientPublicKeyBase64: string,
  myPrivateKeyBase64: string
): { ciphertext: string; nonce: string } => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = naclUtil.decodeUTF8(message);
  const recipientPublicKey = naclUtil.decodeBase64(recipientPublicKeyBase64);
  const myPrivateKey = naclUtil.decodeBase64(myPrivateKeyBase64);

  const box = nacl.box(messageUint8, nonce, recipientPublicKey, myPrivateKey);
  return { ciphertext: naclUtil.encodeBase64(box), nonce: naclUtil.encodeBase64(nonce) };
};

/**
 * Decrypt a message received from sender (works for both sent and received messages)
 *
 * @param ciphertextBase64 - The encrypted message
 * @param nonceBase64 - The nonce used during encryption
 * @param otherUserPublicKeyBase64 - Public key of the other party (receiver if sent, sender if received)
 * @param myPrivateKeyBase64 - Your private key
 */
export const decryptMessage = (
  ciphertextBase64: string,
  nonceBase64: string,
  otherUserPublicKeyBase64: string,
  myPrivateKeyBase64: string
): string => {
  const box = naclUtil.decodeBase64(ciphertextBase64);
  const nonce = naclUtil.decodeBase64(nonceBase64);
  const otherUserPublicKey = naclUtil.decodeBase64(otherUserPublicKeyBase64);
  const myPrivateKey = naclUtil.decodeBase64(myPrivateKeyBase64);

  const decrypted = nacl.box.open(box, nonce, otherUserPublicKey, myPrivateKey);
  if (!decrypted) return "[Decryption failed]"; // do not throw, just show placeholder

  return naclUtil.encodeUTF8(decrypted);
};
