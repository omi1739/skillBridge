import { Suspense } from 'react';
import LearnView from '@/components/views/LearnView';

export default function LearnPage() {
  return (
    <Suspense>
      <LearnView />
    </Suspense>
  );
}