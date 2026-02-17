import type { StatusHistory, OrderStatus } from '../types';

const STEPS: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered'];

interface Props {
  history: StatusHistory[];
  currentStatus: OrderStatus;
}

export default function StatusTimeline({ history, currentStatus }: Props) {
  const currentIdx = STEPS.indexOf(currentStatus);

  function entryFor(status: OrderStatus) {
    return history.find((h) => h.newStatus === status);
  }

  return (
    <ol className="relative border-l-2 border-slate-200 ml-3">
      {STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const entry = entryFor(step);
        return (
          <li key={step} className="mb-6 ml-6 last:mb-0">
            <span
              className={`absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${
                done ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              {done && (
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <h3 className={`text-sm font-semibold ${done ? 'text-slate-900' : 'text-slate-400'}`}>
              {step}
            </h3>
            {entry && (
              <div className="mt-0.5 text-xs text-slate-500">
                {new Date(entry.changedAt).toLocaleString()}
                {entry.note && <span className="ml-2 italic">— {entry.note}</span>}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
