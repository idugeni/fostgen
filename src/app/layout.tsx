import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Configuration for Geist Sans font
 * @constant {object} geistSans - Geist Sans font configuration
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/**
 * Configuration for Geist Mono font
 * @constant {object} geistMono - Geist Mono font configuration
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Metadata configuration for the application
 * @constant {Metadata} metadata - Application metadata including title and description
 */
export const metadata: Metadata = {
  title: "FostGen - Folder Structure Generator",
  description: "Generate elegant folder structure visualizations from any GitHub repository",
};

/**
 * Root layout component that wraps the entire application
 * @component
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components to be rendered within the layout
 * @returns {JSX.Element} The root layout component with configured fonts and metadata
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}