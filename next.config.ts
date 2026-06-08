import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Google Identity Services のポップアップ連携を安定させる。
        // accounts.google.com の COOP に対し、opener 関係を保持してトークン受け渡しを成立させる。
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
