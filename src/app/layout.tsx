import type { Metadata } from 'next';
import '@socketly/react-ui/styles.css';
import './styles.css';
export const metadata: Metadata = {
  title: 'Inbox starter · Socketly',
  description: 'Next.js notification inbox starter',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
