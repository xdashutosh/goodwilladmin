// Reusable shimmer skeleton building blocks for the admin panel

export function Skel({ w = '100%', h = 14, r = 8, style }) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// Table body of shimmer rows — drops inside an existing `.card.table-wrap`
export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <table className="data">
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c}>
                <div className="skel" style={{ height: 14, width: c === 0 ? '70%' : `${40 + ((c * 17) % 45)}%` }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Dashboard stat cards
export function SkeletonStats({ count = 4 }) {
  return (
    <div className="stat-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="stat-card" key={i}>
          <div className="skel" style={{ width: 46, height: 46, borderRadius: 10 }} />
          <div style={{ flex: 1 }}>
            <div className="skel" style={{ height: 26, width: '40%', marginBottom: 8 }} />
            <div className="skel" style={{ height: 12, width: '60%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Generic form skeleton (card with field placeholders)
export function SkeletonForm({ fields = 6 }) {
  return (
    <div className="skel-form-card">
      <div className="skel" style={{ height: 22, width: 180, marginBottom: 20 }} />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div className="skel" style={{ height: 12, width: 120, marginBottom: 8 }} />
          <div className="skel" style={{ height: 40, width: '100%' }} />
        </div>
      ))}
      <div className="skel" style={{ height: 42, width: 160 }} />
    </div>
  );
}

// Image grid skeleton (for product images)
export function SkeletonImageGrid({ count = 6 }) {
  return (
    <div className="image-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="image-tile" key={i}>
          <div className="skel" style={{ width: '100%', aspectRatio: '1', borderRadius: 0 }} />
          <div className="image-tile-body">
            <div className="skel" style={{ height: 28, width: '100%' }} />
            <div className="skel" style={{ height: 28, width: '100%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
