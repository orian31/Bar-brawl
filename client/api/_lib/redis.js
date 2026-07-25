import { Redis } from "@upstash/redis";

let client = null;
let overrideClient = null;

export function getRedis() {
  if (overrideClient) return overrideClient;
  if (!client) {
    client = Redis.fromEnv();
  }
  return client;
}

// Test-only hook: inject a mock client so route/store logic can be
// exercised without a real Upstash instance.
export function setRedisClientForTesting(mockClient) {
  overrideClient = mockClient;
}
