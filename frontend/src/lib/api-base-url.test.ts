import { describe, expect, it } from "vitest";
import { ApiConfigError, resolveApiBaseUrl } from "./api";

const tunnel = "https://example.trycloudflare.com/api/v1";
const local = "http://127.0.0.1:1000/api/v1";
const publicApi = "https://api.credexfin.com/api/v1";

describe("resolveApiBaseUrl", () => {
  it("uses the same configured URL in the browser and during server rendering", () => {
    expect(resolveApiBaseUrl(publicApi, { dev: false, pageHostname: "credexfin.com" })).toBe(publicApi);
    expect(resolveApiBaseUrl(publicApi, { dev: false })).toBe(publicApi);
    expect(resolveApiBaseUrl(tunnel, { dev: true, pageHostname: "credexfin.com" })).toBe(tunnel);
    expect(resolveApiBaseUrl(tunnel, { dev: true })).toBe(tunnel);
  });

  it("keeps a loopback API URL for local development", () => {
    expect(resolveApiBaseUrl(local, { dev: true, pageHostname: "localhost" })).toBe(local);
    expect(resolveApiBaseUrl(local, { dev: true })).toBe(local);
    expect(resolveApiBaseUrl(undefined, { dev: true, pageHostname: "127.0.0.1" })).toBe(local);
  });

  it("does not send a public page to the visitor's localhost", () => {
    expect(() => resolveApiBaseUrl(local, { dev: true, pageHostname: "credexfin.com" })).toThrow(ApiConfigError);
    expect(() => resolveApiBaseUrl(tunnel, { dev: true, pageHostname: "credexfin.com" })).not.toThrow();
  });

  it("rejects a loopback API URL in production", () => {
    expect(() => resolveApiBaseUrl(local, { dev: false })).toThrow(ApiConfigError);
    expect(() => resolveApiBaseUrl(undefined, { dev: false, pageHostname: "credexfin.com" })).toThrow(ApiConfigError);
  });
});
