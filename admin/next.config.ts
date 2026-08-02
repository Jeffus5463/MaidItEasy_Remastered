import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Lets the dev server serve /_next/* assets and RSC requests to a
  // phone/other device on the LAN testing via this machine's IP — Next
  // otherwise only trusts localhost and silently blocks those requests,
  // which leaves the page stuck on its initial server-rendered "Loading…"
  // state (the client JS that would clear it never finishes loading).
  allowedDevOrigins: ["192.168.1.74"],
};

export default nextConfig;
