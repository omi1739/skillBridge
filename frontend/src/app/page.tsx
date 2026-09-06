'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSkillBridge } from '@/lib/skillbridge-context';
import PublicNavbar from '@/components/PublicNavbar';
import PublicHomeView from '@/components/views/PublicHomeView';
import SiteFooter from '@/components/SiteFooter';

export default function LandingPage() {
  const router = useRouter();
  const { currentUser } = useSkillBridge();

  useEffect(() => {
    if (currentUser) {
      router.replace('/market');
    }
  }, [currentUser, router]);

  if (currentUser) return null;

  return (
    <div>
      <PublicNavbar />
      <div className="public-container">
        <PublicHomeView />
      </div>
      <SiteFooter />
    </div>
  );
}