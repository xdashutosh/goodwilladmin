import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api, { apiError } from '../lib/api';
import Modal from '../components/Modal';
import { SkeletonTable } from '../components/Skeleton';

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const EMPTY = {
  section_id: '', name: '', slug: '', description: '',
  size_label: '', type_label: '', image_url: '',
  meta_title: '', meta_description: '', meta_keywords: '',
  sort_order: 0, is_active: true,
};

export default function Categories() {
  const [rows, setRows] = useState([]);
  const [sections, setSections] = useState([]);
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
      const [cats, secs] = await Promise.all([
        api.get('/categories/admin/all'),
        api.get('/sections/admin/all'),
      ]);
      setRows(cats.data);
      setSections(secs.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, section_id: sections[0]?.id || '' });
    setSlugTouched(false); setError(''); setModalOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...EMPTY, ...row, section_id: row.section_id });
    setSlugTouched(true); setError(''); setModalOpen(true);
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const onNameChange = (value) =>
    setForm((f) => ({ ...f, name: value, slug: slugTouched ? f.slug : slugify(value) }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.section_id) { setError('Please choose a section'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        section_id: Number(form.section_id),
        sort_order: Number(form.sort_order) || 0,
        size_label: form.size_label || null,
        type_label: form.type_label || null,
      };
      if (editing) await api.put(`/categories/${editing.id}`, payload);
      else await api.post('/categories', payload);
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete category "${row.name}"? Products in it will also be removed.`)) return;
    try {
      await api.delete(`/categories/${row.id}`);
      await load();
    } catch (err) {
      alert(apiError(err));
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Categories</h1>
        <button className="btn btn-primary" onClick={openCreate} disabled={sections.length === 0}>
          <Plus size={16} /> New Category
        </button>
      </div>

      {sections.length === 0 && !loading && (
        <div className="alert alert-error">Create a section first before adding categories.</div>
      )}
      {error && !modalOpen && <div className="alert alert-error">{error}</div>}

      <div className="card table-wrap">
        {loading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <div className="empty-state">No categories yet.</div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Section</th>
                <th>Size</th>
                <th>Type</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.name}</strong><div className="muted" style={{ fontSize: '0.78rem' }}>{row.slug}</div></td>
                  <td>{row.section_name}</td>
                  <td>{row.size_label || '—'}</td>
                  <td>{row.type_label || '—'}</td>
                  <td><span className={`badge ${row.is_active ? 'badge-green' : 'badge-gray'}`}>{row.is_active ? 'Active' : 'Hidden'}</span></td>
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
          title={editing ? 'Edit Category' : 'New Category'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" form="cat-form" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          {error && <div className="alert alert-error">{error}</div>}
          <form id="cat-form" onSubmit={save}>
            <div className="form-group">
              <label className="field-label">Section *</label>
              <select value={form.section_id} onChange={(e) => setField('section_id', e.target.value)} required>
                <option value="">Select section…</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
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
            <div className="form-row">
              <div className="form-group">
                <label className="field-label">Size Label</label>
                <input type="text" value={form.size_label || ''} onChange={(e) => setField('size_label', e.target.value)} placeholder="e.g. A5" />
              </div>
              <div className="form-group">
                <label className="field-label">Type Label</label>
                <input type="text" value={form.type_label || ''} onChange={(e) => setField('type_label', e.target.value)} placeholder="e.g. Daily" />
              </div>
            </div>
            <div className="form-group">
              <label className="field-label">Description</label>
              <textarea value={form.description || ''} onChange={(e) => setField('description', e.target.value)} />
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
