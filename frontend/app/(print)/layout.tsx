import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Imprimir",
};

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="print-root min-h-screen bg-white text-black">{children}</div>;
}
