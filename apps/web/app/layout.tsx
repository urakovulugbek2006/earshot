import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Earshot',
  description: 'A music streaming service built around synchronized social listening.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Night is the default theme (ADR-0012), so no data-theme attribute is set
  // here. The light theme applies under [data-theme="light"] or when the OS
  // asks for light and no explicit choice has been made.
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
