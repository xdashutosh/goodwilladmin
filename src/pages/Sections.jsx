import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api, { apiError } from '../lib/api';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const EMPTY = {
  name: '', slug: '', description: '', image_url: '',
  meta_title: '', meta_description: '', meta_keywords: '',
  sort_order: 0, is_active: true,
};

export default function Sections() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sections/admin/all');
      setRows(data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setSlugTouched(false); setError(''); setModalOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...EMPTY, ...row });
    setSlugTouched(true);
    setError('');
    setModalOpen(true);
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const onNameChange = (value) => {
    setForm((f) => ({ ...f, name: value, slug: slugTouched ? f.slug : slugify(value) }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, sort_order: Number(form.sort_order) || 0 };
      if (editing) {
        await api.put(`/sections/${editing.id}`, payload);
      } else {
        await api.post('/sections', payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete section "${row.name}"? This will also remove its categories and products.`)) return;
    try {
      await api.delete(`/sections/${row.id}`);
      await load();
    } catch (err) {
      alert(apiError(err));
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Sections</h1>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> New Section</button>
      </div>

      {error && !modalOpen && <div className="alert alert-error">{error}</div>}

      <div className="card table-wrap">
        {loading ? (
          <SkeletonTable rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <div className="empty-state">No sections yet. Create your first one.</div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Order</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.name}</strong></td>
                  <td className="muted">{row.slug}</td>
                  <td>{row.sort_order}</td>
                  <td>
                    <span className={`badge ${row.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {row.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-sm btn-icon" onClick={() => openEdit(row)} title="Edit"><Pencil size={15} /></button>
                      <button className="btn btn-sm btn-icon btn-danger" onClick={() => remove(row)} title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editing ? 'Edit Section' : 'New Section'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" form="section-form" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          {error && <div className="alert alert-error">{error}</div>}
          <form id="section-form" onSubmit={save}>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Name *</label>
                <input type="text" required value={form.name} onChange={(e) => onNameChange(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="field-label">Slug *</label>
                <input type="text" required value={form.slug} onChange={(e) => { setSlugTouched(true); setField('slug', e.target.value); }} />
              </div>
            </div>
            <div className="form-group">
              <label className="field-label">Description</label>
              <textarea value={form.description || ''} onChange={(e) => setField('description', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="field-label">Image URL</label>
              <input type="text" value={form.image_url || ''} onChange={(e) => setField('image_url', e.target.value)} placeholder="https://…" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Meta Title</label>
                <input type="text" value={form.meta_title || ''} onChange={(e) => setField('meta_title', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="field-label">Meta Keywords</label>
                <input type="text" value={form.meta_keywords || ''} onChange={(e) => setField('meta_keywords', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="field-label">Meta Description</label>
              <textarea value={form.meta_description || ''} onChange={(e) => setField('meta_description', e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Sort Order</label>
                <input type="number" value={form.sort_order} onChange={(e) => setField('sort_order', e.target.value)} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <label className="checkbox-row">
                  <input type="checkbox" checked={!!form.is_active} onChange={(e) => setField('is_active', e.target.checked)} />
                  <span>Active (visible on website)</span>
                </label>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
