import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api, { apiError } from '../lib/api';
import { SkeletonTable } from '../components/Skeleton';

const LIMIT = 20;

const primaryThumb = (p) => {
  if (!p.images || p.images.length === 0) return null;
  return (p.images.find((i) => i.is_primary) || p.images[0]).thumbnail_url;
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/categories/admin/all').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products/admin/all', {
        params: { page, limit: LIMIT, search: search || undefined, category_id: categoryId || undefined },
      });
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryId]);

  useEffect(() => { load(); }, [load]);

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete product "${p.name}" and all its images?`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      await load();
    } catch (err) {
      alert(apiError(err));
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Products <span className="muted" style={{ fontSize: '0.9rem' }}>({total})</span></h1>
        <Link to="/products/new" className="btn btn-primary"><Plus size={16} /> Add Product</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="toolbar">
        <form onSubmit={submitSearch} style={{ display: 'flex', gap: '0.5rem' }}>
          <input type="text" placeholder="Search products…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          <button type="submit" className="btn"><Search size={16} /></button>
        </form>
        <select value={categoryId} onChange={(e) => { setPage(1); setCategoryId(e.target.value); }}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card table-wrap">
        {loading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : products.length === 0 ? (
          <div className="empty-state">No products found.</div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Featured</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    {primaryThumb(p) ? <img className="thumb" src={primaryThumb(p)} alt="" /> : <div className="thumb" />}
                  </td>
                  <td>
                    <strong>{p.name}</strong>
                    <div className="muted" style={{ fontSize: '0.78rem' }}>{p.slug}</div>
                  </td>
                  <td>{p.category_name}</td>
                  <td>{p.is_featured ? <span className="badge badge-gold">Featured</span> : <span className="muted">—</span>}</td>
                  <td><span className={`badge ${p.is_active ? 'badge-green' : 'badge-gray'}`}>{p.is_active ? 'Active' : 'Hidden'}</span></td>
                  <td>
                    <div className="row-actions">
                      <Link className="btn btn-sm btn-icon" to={`/products/${p.id}`} title="Edit"><Pencil size={15} /></Link>
                      <button className="btn btn-sm btn-icon btn-danger" onClick={() => remove(p)} title="Delete"><Trash2 size={15} /></button>
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
    </div>
  );
}
