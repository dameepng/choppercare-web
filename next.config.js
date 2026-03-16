const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/choppercare\.toeanmuda\.id\/api\/.*/i,
      handler: "NetworkOnly",
    },
    {
      urlPattern: /\.(?:js|css|woff2)$/i,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "static-resources" },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "images",
        expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
  ],
});

const nextConfig = {
  output: "standalone",
  turbopack: {},
};

module.exports = withPWA(nextConfig);
