'use client';

import { useState } from 'react';
import { BrainCircuit, FileText } from 'lucide-react';
import SkillAssessmentView from '@/components/views/SkillAssessmentView';
import AssessmentView from '@/components/views/AssessmentView';
import { Segmented } from '@/components/ui/primitives';

export default function AssessmentPage() {
  const [mode, setMode] = useState<'diagnostic' | 'skill'>('diagnostic');

  return (
    <div className="stack stack-lg">
      <div className="toolbar">
        <Segmented
          value={mode}
          onChange={v => setMode(v as 'diagnostic' | 'skill')}
          options={[
            { value: 'diagnostic', label: <><FileText size={14} /> Diagnostic Test</> },
            { value: 'skill', label: <><BrainCircuit size={14} /> Skill Assessment</> }
          ]}
        />
      </div>

      <div key={mode}>
        {mode === 'diagnostic' ? <AssessmentView /> : <SkillAssessmentView />}
      </div>
    </div>
  );
}