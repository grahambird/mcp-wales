import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCP Wales",
  description: "Connect your AI assistant to Welsh Census statistics, Cardiff schools and food hygiene records, plus live National Rail departures across Great Britain.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#f8faf6" }}>
        {children}
      </body>
    </html>
  );
}
