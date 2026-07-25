import { Redis } from "@upstash/redis";

let client = null;
let overrideClient = null;

// Vercel's "Upstash" Storage integration names the REST credentials
// KV_REST_API_URL / KV_REST_API_TOKEN (a holdover from when this same
// integration was called Vercel KV). A plain Upstash account created
// directly uses UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. Support
// both so it works whichever way the database was provisioned.
function readCredentials() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Missing Redis credentials: set KV_REST_API_URL/KV_REST_API_TOKEN " +
        "(Vercel Upstash integration) or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN"
    );
  }
  return { url, token };
}

export function getRedis() {
  if (overrideClient) return overrideClient;
  if (!client) {
    client = new Redis(readCredentials());
  }
  return client;
}

// Test-only hook: inject a mock client so route/store logic can be
// exercised without a real Upstash instance.
export function setRedisClientForTesting(mockClient) {
  overrideClient = mockClient;
}
