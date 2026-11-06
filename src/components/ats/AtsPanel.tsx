import type { ResumeDoc } from '../../types/resume';
import type { AtsReport } from '../../lib/ats/score';
import { resumeToPlainText } from '../../lib/text';
import { useResumeStore } from '../../store/useResumeStore';
import { TextArea } from '../ui/primitives';
import { AiReviewCard, AtsReportView } from './AtsReportView';

export const AtsPanel = ({ doc, report, jd, setJd }: { doc: ResumeDoc; report: AtsReport; jd: string; setJd: (v: string) => void }) => (
  <>
    <TextArea
      label="Target job description (optional)"
      rows={4}
      placeholder="Paste the job post here to see keyword coverage and gaps…"
      value={jd}
      onChange={(e) => setJd(e.target.value)}
      hint="Your score updates live as you edit your resume."
    />
    <AtsReportView report={report} />
    <AiReviewCard
      resumeText={resumeToPlainText(doc.data, doc.layout)}
      jobDescription={jd}
      onApplySummary={(summary) => useResumeStore.getState().updateData((d) => ({ ...d, summary }))}
    />
  </>
);
