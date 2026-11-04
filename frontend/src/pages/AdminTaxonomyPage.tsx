import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taxonomyApi } from '../api/taxonomy';
import type { Category, Industry } from '../types/api';

type TaxonomyTab = 'industries' | 'categories';

type TaxonomyItem = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  usageCount: number;
  usageLabel: string;
};

function toIndustryItem(item: Industry): TaxonomyItem {
  const usageCount = item._count?.companies ?? 0;
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    isActive: item.isActive !== false,
    usageCount,
    usageLabel: usageCount === 1 ? '1 company' : `${usageCount} companies`,
  };
}

function toCategoryItem(item: Category): TaxonomyItem {
  const usageCount = item._count?.jobs ?? 0;
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    isActive: item.isActive !== false,
    usageCount,
    usageLabel: usageCount === 1 ? '1 job' : `${usageCount} jobs`,
  };
}

export const AdminTaxonomyPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TaxonomyTab>('industries');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaxonomyItem | null>(null);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaxonomyItem | null>(null);

  const industriesQuery = useQuery({
    queryKey: ['admin', 'taxonomy', 'industries'],
    queryFn: () => taxonomyApi.adminListIndustries(),
  });

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'taxonomy', 'categories'],
    queryFn: () => taxonomyApi.adminListCategories(),
  });

  const activeQuery = tab === 'industries' ? industriesQuery : categoriesQuery;
  const items = useMemo(() => {
    const raw =
      tab === 'industries'
        ? (industriesQuery.data ?? []).map(toIndustryItem)
        : (categoriesQuery.data ?? []).map(toCategoryItem);
    const q = search.trim().toLowerCase();
    return raw.filter((item) => {
      if (statusFilter === 'active' && !item.isActive) return false;
      if (statusFilter === 'inactive' && item.isActive) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q);
    });
  }, [tab, industriesQuery.data, categoriesQuery.data, search, statusFilter]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'taxonomy'] });
    void queryClient.invalidateQueries({ queryKey: ['taxonomy'] });
    // Public lists used by employer/candidate forms
    void queryClient.invalidateQueries({ queryKey: ['industries'] });
    void queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name: name.trim(), isActive };
      if (!payload.name) throw new Error('Name is required.');
      if (tab === 'industries') {
        return editing
          ? taxonomyApi.updateIndustry(editing.id, payload)
          : taxonomyApi.createIndustry(payload);
      }
      return editing
        ? taxonomyApi.updateCategory(editing.id, payload)
        : taxonomyApi.createCategory(payload);
    },
    onSuccess: () => {
      setFormError(null);
      setFormOpen(false);
      setEditing(null);
      setName('');
      setIsActive(true);
      invalidate();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async (item: TaxonomyItem) => {
      const payload = { name: item.name, isActive: !item.isActive };
      if (tab === 'industries') return taxonomyApi.updateIndustry(item.id, payload);
      return taxonomyApi.updateCategory(item.id, payload);
    },
    onSuccess: () => {
      setActionError(null);
      invalidate();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: TaxonomyItem) => {
      const kind = tab === 'industries' ? 'industries' : 'categories';
      return taxonomyApi.removeTaxonomy(kind, item.id);
    },
    onSuccess: () => {
      setActionError(null);
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err: Error) => {
      setActionError(err.message);
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setFormError(null);
    setEditing(null);
    setName('');
    setIsActive(true);
    setFormOpen(true);
  };

  const openEdit = (item: TaxonomyItem) => {
    setFormError(null);
    setEditing(item);
    setName(item.name);
    setIsActive(item.isActive);
    setFormOpen(true);
  };

  const noun = tab === 'industries' ? 'industry' : 'job category';
  const nounPlural = tab === 'industries' ? 'Industries' : 'Job categories';
  const totalCount =
    tab === 'industries'
      ? (industriesQuery.data ?? []).length
      : (categoriesQuery.data ?? []).length;

  return (
    <div className="stack">
      <div
        className="page-header"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <span className="section-eyebrow">Platform settings</span>
          <h1>Industries &amp; Categories</h1>
          <p className="muted">
            Add or update taxonomy values used on company profiles, job postings, and job search
            filters. New active entries appear for employers and candidates automatically.
          </p>
        </div>
        <button
          type="button"
          className="btn-nav-register"
          style={{ border: 'none', cursor: 'pointer' }}
          onClick={openCreate}
        >
          + Add {noun}
        </button>
      </div>

      <div className="admin-page-tabs">
        <button
          type="button"
          className={tab === 'industries' ? 'selected' : ''}
          onClick={() => {
            setTab('industries');
            setActionError(null);
            setFormOpen(false);
          }}
        >
          Industries
          <span>{(industriesQuery.data ?? []).length}</span>
        </button>
        <button
          type="button"
          className={tab === 'categories' ? 'selected' : ''}
          onClick={() => {
            setTab('categories');
            setActionError(null);
            setFormOpen(false);
          }}
        >
          Job categories
          <span>{(categoriesQuery.data ?? []).length}</span>
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '0.65rem',
          alignItems: 'center',
          marginBottom: '0.85rem',
          flexWrap: 'wrap',
        }}
      >
        <label htmlFor="taxonomy-search" className="notif-search" style={{ flex: '1 1 240px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <circle cx="11" cy="11" r="7" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            id="taxonomy-search"
            type="search"
            placeholder={`Search ${nounPlural.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={`Search ${nounPlural.toLowerCase()}`}
          />
        </label>
        <label className="notif-date-select">
          <span className="visually-hidden">Status filter</span>
          <select
            id="taxonomy-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      {actionError && <div className="alert-box-error">{actionError}</div>}
      {activeQuery.isLoading && <div className="card">Loading {nounPlural.toLowerCase()}…</div>}
      {activeQuery.isError && (
        <div className="alert-box-error">{(activeQuery.error as Error).message}</div>
      )}

      {!activeQuery.isLoading && !activeQuery.isError && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="admin-panel-heading" style={{ padding: '1.1rem 1.25rem 0.85rem', margin: 0 }}>
            <div>
              <h2>{nounPlural}</h2>
              <p>
                Showing {items.length} of {totalCount} {nounPlural.toLowerCase()}.
              </p>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="muted" style={{ padding: '0 1.25rem 1.25rem' }}>
              No {nounPlural.toLowerCase()} match your filters.
            </p>
          ) : (
            <div className="admin-taxonomy-list">
              {items.map((item) => (
                <article key={item.id} className="admin-taxonomy-row">
                  <div className="admin-taxonomy-header-line">
                    <h3>{item.name}</h3>
                    <span
                      className={`admin-taxonomy-status ${item.isActive ? 'is-active' : 'is-inactive'}`}
                    >
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="admin-taxonomy-meta-line">
                    <code>{item.slug}</code>
                    <span className="admin-taxonomy-dot">·</span>
                    <span className="admin-taxonomy-usage">{item.usageLabel}</span>
                  </div>
                  <div className="admin-taxonomy-actions">
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => openEdit(item)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      disabled={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate(item)}
                    >
                      {item.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        setActionError(null);
                        setDeleteTarget(item);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {formOpen && (
        <div
          className="emp-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="taxonomy-form-title"
          onClick={() => !saveMutation.isPending && setFormOpen(false)}
        >
          <div className="emp-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <div>
                <h3 id="taxonomy-form-title" className="emp-modal-title">
                  {editing ? `Edit ${noun}` : `Add ${noun}`}
                </h3>
                <p className="emp-modal-subtitle">
                  {tab === 'industries'
                    ? 'Industries classify companies on employer profiles.'
                    : 'Job categories classify vacancies on postings and search filters.'}
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setFormOpen(false)}
                disabled={saveMutation.isPending}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="emp-modal-body">
                {formError && (
                  <div className="alert-box-error" style={{ marginBottom: '1rem' }}>
                    {formError}
                  </div>
                )}
                <div className="form-input-group">
                  <label htmlFor="taxonomy-name">Name</label>
                  <input
                    id="taxonomy-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={tab === 'industries' ? 'e.g. Renewable Energy' : 'e.g. Data Science'}
                    required
                    maxLength={150}
                    autoFocus
                  />
                </div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    marginTop: '1rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Active (visible to employers and candidates)
                </label>
              </div>
              <div className="emp-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setFormOpen(false)}
                  disabled={saveMutation.isPending}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving…' : editing ? 'Save changes' : `Add ${noun}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="emp-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="taxonomy-delete-title"
          onClick={() => !deleteMutation.isPending && setDeleteTarget(null)}
        >
          <div className="emp-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <div>
                <h3 id="taxonomy-delete-title" className="emp-modal-title">
                  Delete {noun}?
                </h3>
                <p className="emp-modal-subtitle">
                  Permanently remove &ldquo;{deleteTarget.name}&rdquo;. If it is in use, delete will
                  fail — deactivate it instead.
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="emp-modal-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: '#dc2626', color: '#fff', border: 'none', fontWeight: 700 }}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget)}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
