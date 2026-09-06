'use client';

import PublicNavbar from '@/components/PublicNavbar';
import PublicHomeView from '@/components/views/PublicHomeView';
import SiteFooter from '@/components/SiteFooter';

export default function LandingPage() {
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