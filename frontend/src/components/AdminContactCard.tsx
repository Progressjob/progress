import React from 'react';

/** Progress Manpower HQ — shown to company portal users when they need admin help. */
export const AdminContactCard: React.FC = () => (
  <aside className="card" style={{ marginTop: '1.5rem', borderLeft: '4px solid var(--primary, #0a2540)' }}>
    <h3 style={{ marginTop: 0 }}>Contact Progress (Admin)</h3>
    <p className="muted" style={{ marginBottom: '1rem' }}>
      For company verification, job review, or posting access, reach our team directly.
    </p>
    <div className="stack" style={{ gap: '0.5rem', fontSize: '0.95rem' }}>
      <div>
        <strong>Location:</strong> Dukem, Oromia Region, Ethiopia
      </div>
      <div>
        <strong>Telephone:</strong> +251 11 887 9710
      </div>
      <div>
        <strong>Mobile / Hotline:</strong> +251 949 811 818 / +251 994 251 515
      </div>
      <div>
        <strong>Email:</strong> progressjobs8@gmail.com
      </div>
    </div>
  </aside>
);
