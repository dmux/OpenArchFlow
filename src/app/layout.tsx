import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
    title: {
        default: "OpenArchFlow - AI-Powered AWS Architecture Diagram Generator",
        template: "%s | OpenArchFlow"
    },
    description: "Transform natural language into professional AWS cloud architecture diagrams. Free, open-source, privacy-first PWA with AI-powered generation using Gemini or local WebLLM. No account required.",
    keywords: [
        "AWS architecture diagram",
        "cloud architecture",
        "AWS diagram generator",
        "AI diagram tool",
        "architecture visualization",
        "AWS services",
        "cloud infrastructure",
        "DevOps tools",
        "serverless architecture",
        "AWS Lambda",
        "API Gateway",
        "DynamoDB",
        "S3",
        "CloudFront",
        "React Flow",
        "diagram as code",
        "infrastructure diagram",
        "technical architecture",
        "system design",
        "Gemini AI",
        "WebLLM",
        "privacy-first",
        "offline AI",
        "progressive web app",
        "PWA",
        "open source"
    ],
    authors: [{ name: "Rafael Sales" }],
    creator: "Rafael Sales",
    publisher: "OpenArchFlow",
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://openarchflow.cloud"),
    alternates: {
        canonical: "/"
    },
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "/",
        title: "OpenArchFlow - AI-Powered AWS Architecture Diagram Generator",
        description: "Transform natural language into professional AWS cloud architecture diagrams. Free, open-source, privacy-first PWA with AI-powered generation.",
        siteName: "OpenArchFlow",
        images: [
            {
                url: "/docs/screenshot.png",
                width: 1200,
                height: 630,
                alt: "OpenArchFlow - AWS Architecture Diagram Generator"
            }
        ]
    },
    twitter: {
        card: "summary_large_image",
        title: "OpenArchFlow - AI-Powered AWS Architecture Diagram Generator",
        description: "Transform natural language into professional AWS cloud architecture diagrams. Free, open-source, privacy-first.",
        images: ["/docs/screenshot.png"],
        creator: "@dmux"
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1
        }
    },
    icons: {
        icon: "/favicon.ico",
        apple: "/apple-touch-icon.png"
    },
    manifest: "/manifest.json",
    category: "technology",
    applicationName: "OpenArchFlow",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "OpenArchFlow"
    },
    formatDetection: {
        telephone: false
    }
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }
    ],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={cn(
                    "min-h-screen bg-background font-sans antialiased",
                    inter.variable
                )}
                suppressHydrationWarning
            >
                {children}
                <Analytics />
                <Toaster />
            </body>
        </html>
    );
}
