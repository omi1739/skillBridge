'use client';

import { useEffect } from 'react';
import { useSkillBridge } from '@/lib/skillbridge-context';
import SkillAdminView from '@/components/views/SkillAdminView';
import AdminView from '@/components/views/AdminView';

export default function AdminPage() {
  const { currentUser, authToken, loadAdminSkillQuestions } = useSkillBridge();

  useEffect(() => {
    if (currentUser?.role === 'ADMIN' && authToken) {
      loadAdminSkillQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role, authToken]);

  if (currentUser?.role !== 'ADMIN') return null;

  return (
    <>
      <SkillAdminView />
      <AdminView />
    </>
  );
}