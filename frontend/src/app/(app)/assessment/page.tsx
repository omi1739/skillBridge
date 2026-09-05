import { BrainCircuit } from 'lucide-react';
import SkillAssessmentView from '@/components/views/SkillAssessmentView';
import AssessmentView from '@/components/views/AssessmentView';

export default function AssessmentPage() {
  return (
    <>
      <div className="card" style={{ marginBottom: '1.5rem', padding: '0', overflow: 'hidden' }}>
        <div className="card-header" style={{ alignItems: 'center', background: 'rgba(56,189,248,0.05)' }}>
          <div>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BrainCircuit size={18} style={{ color: '#38bdf8' }} /> Skill Assessment (New)
            </h2>
            <p className="card-subtitle">Difficulty-weighted, server-evaluated skill exams with per-topic results.</p>
          </div>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <SkillAssessmentView />
        </div>
      </div>
      <AssessmentView />
    </>
  );
}