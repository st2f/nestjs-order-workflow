import { AlertTriangle, CheckCircle2, GraduationCap } from 'lucide-react';

type DebugControlsProps = {
  busy: boolean;
  onSuccess: () => void;
  onPaymentFailure: () => void;
  onEnrollmentFailure: () => void;
};

export function DebugControls({
  busy,
  onSuccess,
  onPaymentFailure,
  onEnrollmentFailure,
}: DebugControlsProps) {
  return (
    <div className="toolbar" aria-label="Workflow scenarios">
      <button className="primary" disabled={busy} onClick={onSuccess}>
        <CheckCircle2 size={18} aria-hidden="true" />
        Create success
      </button>
      <button disabled={busy} onClick={onPaymentFailure}>
        <AlertTriangle size={18} aria-hidden="true" />
        Payment failure
      </button>
      <button disabled={busy} onClick={onEnrollmentFailure}>
        <GraduationCap size={18} aria-hidden="true" />
        Enrollment failure
      </button>
    </div>
  );
}
