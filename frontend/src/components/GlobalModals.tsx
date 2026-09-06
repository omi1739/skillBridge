'use client';

import AuthModal from './modals/AuthModal';
import ProjectModal from './modals/ProjectModal';
import PassportModal from './modals/PassportModal';
import EditProfileModal from './modals/EditProfileModal';

export default function GlobalModals() {
  return (
    <>
      <ProjectModal />
      <PassportModal />
      <EditProfileModal />
      <AuthModal />
    </>
  );
}