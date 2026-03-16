import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata = {
  title: "ChopperCare - Asisten Tanggap Bencana",
  description:
    "Asisten AI untuk informasi tanggap bencana Indonesia berbasis BNPB",
  manifest: "/manifest.json",
  themeColor: "#DC2626",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ChopperCare",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta name="dicoding:email" content="ahmaddamanhuri45@gmail.com" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </head>
      <body className={geist.className}>{children}</body>
    </html>
  );
}
