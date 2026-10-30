import { useNavigate } from 'react-router-dom';

/** Returns to the previous in-app entry; direct links get a useful fallback. */
export function BackButton({ fallback = '/' }: { fallback?: string }) {
  const navigate = useNavigate();
  return <button type="button" className="page-back-button" onClick={() => {
    if (typeof window.history.state?.idx === 'number' && window.history.state.idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M19 12H5m7-7-7 7 7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    Back
  </button>;
}
