'use client';

import AuthModal from './modals/AuthModal';
import ProjectModal from './modals/ProjectModal';
import PassportModal from './modals/PassportModal';

export default function GlobalModals() {
  return (
    <>
      <ProjectModal />
      <PassportModal />
      <AuthModal />
    </>
  );
}