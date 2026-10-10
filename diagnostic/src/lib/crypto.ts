import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./env";

/** AES-256-GCM for guardian contact details. Key: 32 bytes, base64, in DATA_ENCRYPTION_KEY. */
function key(): Buffer {
  const k = Buffer.from(env.encryptionKey(), "base64");
  if (k.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return k;
}

export function encrypt(plain: string | null | undefined): string | null {
  if (!plain) return null;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), data.toString("base64")].join(".");
}

export function decrypt(blob: string | null | undefined): string | null {
  if (!blob) return null;
  const [v, iv, tag, data] = blob.split(".");
  if (v !== "v1") throw new Error("Unknown ciphertext version");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
}
