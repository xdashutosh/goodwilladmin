import { useEffect, useState, useCallback } from 'react';
import { Trash2, Eye } from 'lucide-react';
import api, { apiError } from '../lib/api';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';

const LIMIT = 20;
const STATUSES = ['new', 'contacted', 'resolved'];
const FRONTEND_URL = (import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const badgeClass = (s) => (s === 'new' ? 'badge-gold' : s === 'resolved' ? 'badge-green' : 'badge-blue');

export default function Enquiries() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/enquiries/admin/all', {
        params: { page, limit: LIMIT, status: statusFilter || undefined },
      });
      setRows(data.enquiries || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (row, status) => {
    try {
      await api.put(`/enquiries/${row.id}/status`, { status });
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status } : r)));
      if (viewing?.id === row.id) setViewing({ ...viewing, status });
    } catch (err) {
      alert(apiError(err));
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete enquiry from ${row.name}?`)) return;
    try {
      await api.delete(`/enquiries/${row.id}`);
      setViewing(null);
      await load();
    } catch (err) {
      alert(apiError(err));
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Enquiries <span className="muted" style={{ fontSize: '0.9rem' }}>({total})</span></h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card table-wrap">
        {loading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : rows.length === 0 ? (
          <div className="empty-state">No enquiries.</div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Product</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.name}</strong>{r.company && <div className="muted" style={{ fontSize: '0.78rem' }}>{r.company}</div>}</td>
                  <td>
                    <div>{r.email}</div>
                    {r.phone && <div className="muted" style={{ fontSize: '0.78rem' }}>{r.phone}</div>}
                  </td>
                  <td>
                    {r.product_id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {r.product_image ? (
                          <img
                            src={r.product_image}
                            alt=""
                            style={{ width: 46, height: 46, objectFit: 'contain', borderRadius: 8, background: '#f4f7fc', border: '1px solid var(--border)', padding: 3, flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{ width: 46, height: 46, borderRadius: 8, background: '#f4f7fc', border: '1px solid var(--border)', flexShrink: 0 }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.product_name}</div>
                          {r.product_category && <div className="muted" style={{ fontSize: '0.75rem' }}>{r.product_category}</div>}
                        </div>
                      </div>
                    ) : (
                      <span className="muted">General</span>
                    )}
                  </td>
                  <td>
                    <select value={r.status} onChange={(e) => changeStatus(r, e.target.value)} style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="muted">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-sm btn-icon" title="View" onClick={() => setViewing(r)}><Eye size={15} /></button>
                      <button className="btn btn-sm btn-icon btn-danger" title="Delete" onClick={() => remove(r)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="muted">Page {page} of {totalPages}</span>
          <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      {viewing && (
        <Modal
          title="Enquiry Details"
          onClose={() => setViewing(null)}
          footer={
            <>
              <a className="btn" href={`mailto:${viewing.email}`}>Reply by Email</a>
              <button className="btn btn-danger" onClick={() => remove(viewing)}>Delete</button>
            </>
          }
        >
          {viewing.product_id && (
            <div style={{ display: 'flex', gap: '1rem', padding: '0.85rem', border: '1px solid var(--border)', borderRadius: 10, background: '#fafbfc', marginBottom: '1rem' }}>
              {viewing.product_image ? (
                <img
                  src={viewing.product_image}
                  alt={viewing.product_name}
                  style={{ width: 96, height: 96, objectFit: 'contain', borderRadius: 8, background: '#fff', border: '1px solid var(--border)', padding: 4, flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: 96, height: 96, borderRadius: 8, background: '#fff', border: '1px solid var(--border)', flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0 }}>
                <div className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Product Enquiry</div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', margin: '0.2rem 0' }}>{viewing.product_name}</div>
                {(viewing.product_section || viewing.product_category) && (
                  <div className="muted" style={{ fontSize: '0.85rem' }}>{[viewing.product_section, viewing.product_category].filter(Boolean).join(' • ')}</div>
                )}
                {viewing.product_cover_style && (
                  <div className="muted" style={{ fontSize: '0.85rem' }}>Cover style: {viewing.product_cover_style}</div>
                )}
                {viewing.product_slug && (
                  <a href={`${FRONTEND_URL}/product/${viewing.product_slug}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '0.4rem', fontSize: '0.82rem', fontWeight: 600 }}>
                    View product ↗
                  </a>
                )}
              </div>
            </div>
          )}
          <p><strong>Name:</strong> {viewing.name}</p>
          <p><strong>Email:</strong> {viewing.email}</p>
          {viewing.phone && <p><strong>Phone:</strong> {viewing.phone}</p>}
          {viewing.company && <p><strong>Company:</strong> {viewing.company}</p>}
          <p><strong>Status:</strong>{' '}
            <select value={viewing.status} onChange={(e) => changeStatus(viewing, e.target.value)} style={{ width: 'auto', padding: '0.3rem 0.5rem' }}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </p>
          <p style={{ marginTop: '0.75rem' }}><strong>Message:</strong></p>
          <p style={{ whiteSpace: 'pre-wrap', background: '#fafbfc', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}>{viewing.message}</p>
          <p className="muted" style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>Received {new Date(viewing.created_at).toLocaleString()}</p>
        </Modal>
      )}
    </div>
  );
}
