import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Package } from 'lucide-react';

export default function InventoryLookup() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/pos/products/all').then(r => {
      setProducts(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = products.filter(p => {
    const matchQ = !query || p.name.toLowerCase().includes(query.toLowerCase()) ||
                   (p.barcode && p.barcode.includes(query));
    const matchF = filter === 'all' || p.stock_status === filter;
    return matchQ && matchF;
  });

  const statusColor = s => ({ in_stock:'badge-green', low_stock:'badge-yellow', out_of_stock:'badge-red' }[s] || 'badge-gray');

  const counts = {
    in_stock: products.filter(p => p.stock_status === 'in_stock').length,
    low_stock: products.filter(p => p.stock_status === 'low_stock').length,
    out_of_stock: products.filter(p => p.stock_status === 'out_of_stock').length,
  };

  return (
    <div>
      <div className="page-header">
        <h1>Inventory Lookup</h1>
        <p>Check real-time stock availability to assist customers (read-only)</p>
      </div>

      {/* Summary Cards */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon green"><Package size={22} /></div>
          <div>
            <div className="stat-value">{counts.in_stock}</div>
            <div className="stat-label">In Stock</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'#fffde7', color:'#f57f17' }}><Package size={22} /></div>
          <div>
            <div className="stat-value">{counts.low_stock}</div>
            <div className="stat-label">Low Stock</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><Package size={22} /></div>
          <div>
            <div className="stat-value">{counts.out_of_stock}</div>
            <div className="stat-label">Out of Stock</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon brown"><Package size={22} /></div>
          <div>
            <div className="stat-value">{products.length}</div>
            <div className="stat-label">Total Products</div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <Search size={16} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#aaa' }} />
            <input
              type="text"
              placeholder="Search by product name or barcode..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width:'100%', padding:'10px 14px 10px 38px', border:'1.5px solid #e0e0e0', borderRadius:8, fontSize:13, boxSizing:'border-box' }}
            />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {['all','in_stock','low_stock','out_of_stock'].map(f => (
              <button
                key={f}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding:'8px 14px', fontSize:12 }}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        {loading
          ? <p style={{ textAlign:'center', color:'#aaa', padding:30 }}>Loading inventory...</p>
          : <table className="data-table">
              <thead>
                <tr>
                  <th>Barcode</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Walk-in Price</th>
                  <th>Stock</th>
                  <th>Reorder Pt.</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={8} style={{ textAlign:'center', color:'#aaa', padding:30 }}>No products found.</td></tr>
                  : filtered.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontSize:11, color:'#aaa', fontFamily:'monospace' }}>{p.barcode || '—'}</td>
                      <td style={{ fontWeight:600 }}>{p.name}</td>
                      <td>{p.category || '—'}</td>
                      <td style={{ textTransform:'capitalize' }}>{p.type}</td>
                      <td>₱{parseFloat(p.walkin_price).toLocaleString('en-PH', { minimumFractionDigits:2 })}</td>
                      <td style={{ fontWeight:700, color: p.stock <= 0 ? '#c62828' : p.stock <= p.reorder_point ? '#f57f17' : '#2e7d32' }}>
                        {p.stock}
                      </td>
                      <td style={{ color:'#888' }}>{p.reorder_point}</td>
                      <td><span className={`badge ${statusColor(p.stock_status)}`}>{p.stock_status?.replace('_',' ')}</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
        }
      </div>
    </div>
  );
}
