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
    <div
      className="flex flex-wrap gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200"
      aria-label="Workflow scenarios"
    >
      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={busy}
        onClick={onSuccess}
      >
        <CheckCircle2 size={18} aria-hidden="true" />
        Create success
      </button>
      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-gray-300 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={busy}
        onClick={onPaymentFailure}
      >
        <AlertTriangle size={18} aria-hidden="true" />
        Payment failure
      </button>
      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-gray-300 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={busy}
        onClick={onEnrollmentFailure}
      >
        <GraduationCap size={18} aria-hidden="true" />
        Enrollment failure
      </button>
    </div>
  );
}
