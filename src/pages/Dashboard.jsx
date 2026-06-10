import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Tag, Package, Mail, Plus } from 'lucide-react';
import api from '../lib/api';
import { SkeletonStats, SkeletonTable } from '../components/Skeleton';

export default function Dashboard() {
  const [stats, setStats] = useState({ sections: 0, categories: 0, products: 0, enquiries: 0, newEnquiries: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [sections, categories, products, enquiries, newEnq] = await Promise.all([
          api.get('/sections/admin/all'),
          api.get('/categories/admin/all'),
          api.get('/products/admin/all', { params: { limit: 5 } }),
          api.get('/enquiries/admin/all', { params: { limit: 5 } }),
          api.get('/enquiries/admin/all', { params: { status: 'new', limit: 1 } }),
        ]);
        setStats({
          sections: sections.data.length,
          categories: categories.data.length,
          products: products.data.total,
          enquiries: enquiries.data.total,
          newEnquiries: newEnq.data.total,
        });
        setRecent(enquiries.data.enquiries || []);
      } catch (err) {
        console.error('Dashboard load failed', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { label: 'Sections', value: stats.sections, icon: Layers, to: '/sections' },
    { label: 'Categories', value: stats.categories, icon: Tag, to: '/categories' },
    { label: 'Products', value: stats.products, icon: Package, to: '/products' },
    { label: 'Enquiries', value: stats.enquiries, icon: Mail, to: '/enquiries' },
  ];

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
        <Link to="/products/new" className="btn btn-primary"><Plus size={16} /> Add Product</Link>
      </div>

      {loading ? (
        <>
          <SkeletonStats count={4} />
          <div className="card"><div className="table-wrap"><SkeletonTable rows={5} cols={5} /></div></div>
        </>
      ) : (
        <>
          <div className="stat-grid">
            {cards.map((c) => (
              <Link key={c.label} to={c.to} className="stat-card">
                <div className="stat-icon"><c.icon size={22} /></div>
                <div>
                  <div className="stat-value">{c.value}</div>
                  <div className="stat-label">
                    {c.label}
                    {c.label === 'Enquiries' && stats.newEnquiries > 0 && (
                      <span className="badge badge-gold" style={{ marginLeft: 6 }}>{stats.newEnquiries} new</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="card">
            <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Recent Enquiries</h3>
              <Link to="/enquiries" className="btn btn-sm">View all</Link>
            </div>
            <div className="table-wrap">
              {recent.length === 0 ? (
                <div className="empty-state">No enquiries yet.</div>
              ) : (
                <table className="data">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Product</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((e) => (
                      <tr key={e.id}>
                        <td>{e.name}</td>
                        <td>{e.email}</td>
                        <td>{e.product_name || '—'}</td>
                        <td><span className={`badge ${e.status === 'new' ? 'badge-gold' : e.status === 'resolved' ? 'badge-green' : 'badge-blue'}`}>{e.status}</span></td>
                        <td className="muted">{new Date(e.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
