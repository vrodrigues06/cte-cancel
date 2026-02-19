import "../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "CT-e SAP",
  description: "Importação e envio de CT-e para SAP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl p-6">{children}</div>
      </body>
    </html>
  );
}
