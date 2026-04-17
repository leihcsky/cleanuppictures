import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const storageDomain = String(process.env.STORAGE_DOMAIN || "").trim();
export const storageURL = storageDomain ? `https://${storageDomain}` : "";
export const r2Bucket = String(process.env.R2_BUCKET || "").trim();
export const r2Endpoint = String(process.env.R2_ENDPOINT || "").trim();
export const r2AccessKeyId = String(process.env.R2_ACCESS_KEY_ID || "").trim();
export const r2SecretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();

function isR2Configured() {
  return Boolean(storageURL && r2Bucket && r2Endpoint && r2AccessKeyId && r2SecretAccessKey);
}

export function getR2ConfigState() {
  return {
    enabled: isR2Configured(),
    storageDomain,
    bucket: r2Bucket,
    endpoint: r2Endpoint
  };
}

let s3Client: S3Client | null = null;
function getR2Client() {
  if (!isR2Configured()) return null;
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey
      }
    });
  }
  return s3Client;
}

export async function uploadBufferToR2(params: {
  key: string;
  body: Buffer;
  contentType?: string;
  cacheControl?: string;
}) {
  const client = getR2Client();
  if (!client) {
    throw new Error("R2 is not configured");
  }
  await client.send(
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType || "application/octet-stream",
      CacheControl: params.cacheControl || "public, max-age=31536000, immutable"
    })
  );
  return `${storageURL}/${params.key}`;
}

// Backward-compatible wrapper used by legacy code path.
export const R2 = {
  upload: (params: any) => ({
    promise: async () => {
      const key = String(params?.Key || "");
      const body = Buffer.isBuffer(params?.Body) ? params.Body : Buffer.from(params?.Body || "");
      return uploadBufferToR2({ key, body });
    }
  })
};
