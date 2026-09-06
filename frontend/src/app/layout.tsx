import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import { SkillBridgeProvider } from '@/lib/skillbridge-context';
import GlobalModals from '@/components/GlobalModals';

export const metadata: Metadata = {
  title: 'SkillBridge | Evidence-Based Talent Intelligence',
  description: 'Labor market demand analysis, practical diagnostic skill assessments, and explainable career pathways.'
};

const THEME_INIT = `(function(){try{var t=localStorage.getItem('skillbridge_theme');if(t!=='light'&&t!=='dark'){t='light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT }}
        />
      </head>
      <body>
        <SkillBridgeProvider>
          {children}
          <GlobalModals />
        </SkillBridgeProvider>
      </body>
    </html>
  );
}