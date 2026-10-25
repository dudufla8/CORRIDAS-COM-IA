import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Táxi 2.0 | Portal Corporativo B2B de Despacho Inteligente',
  description: 'Despacho automatizado de corridas corporativas via IA Multimodal e integração direta com a API Táxi Digital',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#F4F6FC] text-slate-800 antialiased selection:bg-amber-400 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
