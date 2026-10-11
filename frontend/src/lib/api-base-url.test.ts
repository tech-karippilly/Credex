import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "./api";

describe("resolveApiBaseUrl", () => {
  it("sends browser calls to the local API when the baked URL is a quick tunnel", () => {
    expect(
      resolveApiBaseUrl(
        "https://souls-carter-contacted-vol.trycloudflare.com/api/v1",
        "credexfin.com",
      ),
    ).toBe("http://127.0.0.1:1000/api/v1");
  });

  it("keeps a loopback API URL", () => {
    expect(resolveApiBaseUrl("http://localhost:1000/api/v1", "localhost")).toBe(
      "http://localhost:1000/api/v1",
    );
  });

  it("keeps a stable public API URL", () => {
    expect(resolveApiBaseUrl("https://api.credexfin.com/api/v1", "credexfin.com")).toBe(
      "https://api.credexfin.com/api/v1",
    );
  });

  it("leaves server-side calls on the configured URL", () => {
    expect(
      resolveApiBaseUrl("https://souls-carter-contacted-vol.trycloudflare.com/api/v1"),
    ).toBe("https://souls-carter-contacted-vol.trycloudflare.com/api/v1");
  });
});
