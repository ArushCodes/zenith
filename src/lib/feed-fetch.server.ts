import "@tanstack/react-start/server-only";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { assertSafeFeedUrl, FeedError, isPrivateIpv4 } from "./safe-url";

const MAX_BYTES = 2 * 1024 * 1024;
/** Resolve once, verify every result, then pin the HTTPS connection to that IP. */
async function download(url: URL): Promise<Response> {
  const addresses = await lookup(url.hostname, { all: true });
  if (
    !addresses.length ||
    addresses.some(({ address, family }) =>
      family === 4 ? isPrivateIpv4(address) : !/^[23][0-9a-f]{3}:/i.test(address),
    )
  ) {
    throw new FeedError("Calendar link must resolve to a public website.");
  }
  const destination = new URL(url);
  const address = addresses[0]!;
  destination.hostname = address.family === 6 ? `[${address.address}]` : address.address;
  return new Promise((resolve, reject) => {
    const req = request(
      destination,
      {
        method: "GET",
        servername: url.hostname,
        headers: { Host: url.host, Accept: "text/calendar, text/plain" },
        signal: AbortSignal.timeout(15_000),
      },
      (res) => {
        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_BYTES) {
            req.destroy(new FeedError("Calendar feed exceeds the 2 MB limit."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () => {
          const headers = new Headers();
          if (res.headers.location) headers.set("location", res.headers.location);
          resolve(new Response(Buffer.concat(chunks), { status: res.statusCode ?? 502, headers }));
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

export async function fetchPinnedFeed(raw: string, maxRedirects = 3): Promise<Response> {
  let target = assertSafeFeedUrl(raw);
  for (let i = 0; i <= maxRedirects; i++) {
    const response = await download(target);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new FeedError("Invalid calendar redirect.");
      target = assertSafeFeedUrl(new URL(location, target).toString());
    } else return response;
  }
  throw new FeedError("Calendar redirected too many times.");
}
