import React from 'react';
import type { Workspace } from '../auth/workspace';

interface WorkspaceSwitchProps {
  workspace: Workspace;
  onToggle: () => void;
}

function SwapArrowsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M7 20V6" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M3.4 10.2 7 6l3.6 4.2" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 4v14" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M13.4 13.8 17 18l3.6-4.2" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const WorkspaceSwitch: React.FC<WorkspaceSwitchProps> = ({ workspace, onToggle }) => {
  const label = workspace === 'employer' ? 'Employer' : 'Candidate';
  const next = workspace === 'employer' ? 'candidate' : 'employer';
  return (
    <button
      type="button"
      className="workspace-switch"
      onClick={onToggle}
      aria-label={`Switch to ${next} account`}
    >
      <span className="workspace-switch-label">{label}</span>
      <span className="workspace-switch-icon">
        <SwapArrowsIcon />
      </span>
    </button>
  );
};
