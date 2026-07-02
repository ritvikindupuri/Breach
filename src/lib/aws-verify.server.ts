// SigV4 signer + STS GetCallerIdentity verifier.
// Live-verifies AWS credentials without ever letting them touch the browser.

const enc = new TextEncoder();

function hex(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < b.length; i++) out += b[i].toString(16).padStart(2, "0");
  return out;
}

async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const data = typeof input === "string" ? enc.encode(input) : input;
  return hex(await crypto.subtle.digest("SHA-256", data as unknown as ArrayBuffer));
}

async function hmac(key: Uint8Array, msg: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    "raw",
    key as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return new Uint8Array(sig);
}

async function signingKey(
  secret: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<Uint8Array> {
  const kDate = await hmac(enc.encode("AWS4" + secret), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

export type StsResult =
  | { ok: true; account: string; arn: string; userId: string }
  | { ok: false; error: string };

/**
 * Verifies AWS credentials by calling STS GetCallerIdentity.
 * Region only matters for the endpoint host; STS is global.
 */
export async function verifyWithSts(
  accessKeyId: string,
  secretAccessKey: string,
  sessionToken: string | null,
  region: string,
): Promise<StsResult> {
  const service = "sts";
  const host = "sts.amazonaws.com";
  const method = "POST";
  const body = "Action=GetCallerIdentity&Version=2011-06-15";
  const contentType = "application/x-www-form-urlencoded; charset=utf-8";

  const now = new Date();
  const amzDate =
    now.getUTCFullYear().toString().padStart(4, "0") +
    (now.getUTCMonth() + 1).toString().padStart(2, "0") +
    now.getUTCDate().toString().padStart(2, "0") +
    "T" +
    now.getUTCHours().toString().padStart(2, "0") +
    now.getUTCMinutes().toString().padStart(2, "0") +
    now.getUTCSeconds().toString().padStart(2, "0") +
    "Z";
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256Hex(body);

  const headersToSign: Record<string, string> = {
    "content-type": contentType,
    host,
    "x-amz-date": amzDate,
  };
  if (sessionToken) headersToSign["x-amz-security-token"] = sessionToken;

  const sortedHeaderKeys = Object.keys(headersToSign).sort();
  const canonicalHeaders =
    sortedHeaderKeys.map((k) => `${k}:${headersToSign[k].trim()}`).join("\n") +
    "\n";
  const signedHeaders = sortedHeaderKeys.join(";");

  const canonicalRequest = [
    method,
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/us-east-1/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kSigning = await signingKey(secretAccessKey, dateStamp, "us-east-1", service);
  const signature = hex(await hmac(kSigning, stringToSign));

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const requestHeaders: Record<string, string> = {
    "content-type": contentType,
    "x-amz-date": amzDate,
    Authorization: authorization,
  };
  if (sessionToken) requestHeaders["x-amz-security-token"] = sessionToken;

  try {
    const res = await fetch(`https://${host}/`, {
      method,
      headers: requestHeaders,
      body,
    });
    const text = await res.text();
    if (!res.ok) {
      const err = /<Message>([^<]+)<\/Message>/.exec(text)?.[1] ?? `HTTP ${res.status}`;
      return { ok: false, error: err };
    }
    const account = /<Account>([^<]+)<\/Account>/.exec(text)?.[1] ?? "";
    const arn = /<Arn>([^<]+)<\/Arn>/.exec(text)?.[1] ?? "";
    const userId = /<UserId>([^<]+)<\/UserId>/.exec(text)?.[1] ?? "";
    // region is not used by STS global, but keep signature happy
    void region;
    return { ok: true, account, arn, userId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
