// Envelope encryption helpers using WebCrypto (works on Cloudflare Workers).
// The master key is stored in public.vault_master_key (service-role only).
// Each secret is encrypted with a per-row DEK; the DEK itself is encrypted
// with the master key. A DB dump alone cannot decrypt secrets.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let cachedMaster: CryptoKey | null = null;
async function getMasterKey(): Promise<CryptoKey> {
  if (cachedMaster) return cachedMaster;
  const { data, error } = await supabaseAdmin
    .from("vault_master_key")
    .select("key_b64")
    .eq("id", 1)
    .single();
  if (error || !data) throw new Error("vault master key unavailable");
  const raw = b64decode(data.key_b64) as any;
  cachedMaster = await crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  return cachedMaster;
}

async function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

async function exportRaw(key: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.exportKey("raw", key));
}
async function importDek(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    raw as unknown as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export type EnvelopeCiphertext = {
  payload_ciphertext: string;
  payload_iv: string;
  dek_wrapped: string;
  dek_iv: string;
};

export async function sealPayload(plaintext: string): Promise<EnvelopeCiphertext> {
  const dek = await generateDek();
  const payloadIv = crypto.getRandomValues(new Uint8Array(12) as any);
  const payloadCt = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: payloadIv },
    dek,
    enc.encode(plaintext),
  );

  const master = await getMasterKey();
  const dekIv = crypto.getRandomValues(new Uint8Array(12) as any);
  const dekRaw = await exportRaw(dek);
  const dekWrapped = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: dekIv },
    master,
    dekRaw as unknown as ArrayBuffer,
  );

  return {
    payload_ciphertext: b64encode(payloadCt),
    payload_iv: b64encode(payloadIv),
    dek_wrapped: b64encode(dekWrapped),
    dek_iv: b64encode(dekIv),
  };
}

export async function openPayload(env: EnvelopeCiphertext): Promise<string> {
  const master = await getMasterKey();
  const dekRaw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(env.dek_iv) as any },
    master,
    b64decode(env.dek_wrapped) as any,
  );
  const dek = await importDek(new Uint8Array(dekRaw));
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(env.payload_iv) as any },
    dek,
    b64decode(env.payload_ciphertext) as any,
  );
  return dec.decode(pt);
}

export function maskAccessKey(k: string): string {
  if (!k) return "";
  if (k.length <= 8) return "****";
  return `${k.slice(0, 4)}${"*".repeat(Math.max(4, k.length - 8))}${k.slice(-4)}`;
}
export function maskSecret(k: string | undefined | null): string {
  if (!k) return "";
  return `****${k.slice(-4)}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
