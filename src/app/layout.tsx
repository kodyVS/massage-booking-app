import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const SITE_NAME = "Vital Touch Massage";
const SITE_DESC =
  "Therapeutic massage in a calm, watercolor space. Book Relaxation, Deep Tissue, Thai, and Stress Relief sessions in under two minutes — pay at your visit.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  keywords: [
    "massage",
    "relaxation massage",
    "deep tissue",
    "thai massage",
    "stress relief",
    "booking",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESC,
    images: [
      {
        url: "https://res.cloudinary.com/dwjjrobot/image/upload/v1777697281/file_000000006fec71fdb970fb3f904a52aa_uj4cao.png",
        width: 1200,
        height: 1200,
        alt: "Vital Touch Massage logo.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESC,
    images: [
      "https://res.cloudinary.com/dwjjrobot/image/upload/v1777697281/file_000000006fec71fdb970fb3f904a52aa_uj4cao.png",
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {children}
      </body>
    </html>
  );
}
