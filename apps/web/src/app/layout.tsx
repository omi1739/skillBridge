import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SkillBridge | Evidence-Based Talent Intelligence',
  description: 'Labor market demand analysis, practical diagnostic skill assessments, and explainable career pathways.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
