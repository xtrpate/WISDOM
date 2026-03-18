import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Printer } from 'lucide-react';

const PIE_COLORS = ['#8B4513', '#D2691E', '#1a1a2e', '#16213e', '#4a90d9', '#2e7d32'];

export default function SalesReports() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ period: 'daily', from: '', to: '' });
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters).toString();
      const res = await axios.get(`/api/pos/reports?${params}`);
      setData(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, []);

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1>POS Sales Reports</h1>
          <p>View and filter your walk-in transaction history</p>
        </div>
        <button className="btn btn-secondary" onClick={() => window.print()}>
          <Printer size={16} /> Print Report
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display:'flex', gap:16, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div className="form-field" style={{ minWidth: 150 }}>
            <label>Period</label>
            <select value={filters.period} onChange={e => setFilters({ ...filters, period: e.target.value })}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="form-field">
            <label>From Date</label>
            <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} />
          </div>
          <div className="form-field">
            <label>To Date</label>
            <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
            {loading ? 'Loading...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {data && <>
        {/* KPI Totals */}
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-icon brown" style={{ fontSize:20 }}>🧾</div>
            <div>
              <div className="stat-value">{data.totals.total_orders}</div>
              <div className="stat-label">Total Orders</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green" style={{ fontSize:20 }}>💰</div>
            <div>
              <div className="stat-value">₱{parseFloat(data.totals.grand_total || 0).toLocaleString('en-PH', { minimumFractionDigits:2 })}</div>
              <div className="stat-label">Grand Total</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red" style={{ fontSize:20 }}>🏷️</div>
            <div>
              <div className="stat-value">₱{parseFloat(data.totals.total_discount || 0).toLocaleString('en-PH', { minimumFractionDigits:2 })}</div>
              <div className="stat-label">Total Discounts</div>
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20, marginBottom:20 }}>
          {/* Sales Chart */}
          <div className="card">
            <h3 style={{ marginBottom:16, fontWeight:700, fontSize:15 }}>Sales by Period</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.summary}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period_label" tick={{ fontSize:11 }} />
                <YAxis tick={{ fontSize:11 }} />
                <Tooltip formatter={(v) => [`₱${parseFloat(v).toLocaleString('en-PH', { minimumFractionDigits:2 })}`, 'Sales']} />
                <Bar dataKey="total_sales" fill="#8B4513" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Payment breakdown pie */}
          <div className="card">
            <h3 style={{ marginBottom:16, fontWeight:700, fontSize:15 }}>Payment Methods</h3>
            {data.payment_breakdown.length === 0
              ? <p style={{ color:'#aaa', fontSize:13 }}>No data.</p>
              : <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.payment_breakdown} dataKey="count" nameKey="payment_method" cx="50%" cy="50%" outerRadius={75} label={({ payment_method }) => payment_method}>
                      {data.payment_breakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
            }
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* Top Products */}
          <div className="card">
            <h3 style={{ marginBottom:14, fontWeight:700, fontSize:15 }}>Top Products</h3>
            <table className="data-table">
              <thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead>
              <tbody>
                {data.top_products.map((p, i) => (
                  <tr key={i}>
                    <td style={{ color:'#aaa', fontWeight:700 }}>{i+1}</td>
                    <td>{p.product_name}</td>
                    <td>{p.qty}</td>
                    <td>₱{parseFloat(p.revenue).toLocaleString('en-PH', { minimumFractionDigits:2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Period Summary Table */}
          <div className="card">
            <h3 style={{ marginBottom:14, fontWeight:700, fontSize:15 }}>Period Summary</h3>
            <div style={{ maxHeight:250, overflowY:'auto' }}>
              <table className="data-table">
                <thead><tr><th>Period</th><th>Orders</th><th>Sales</th></tr></thead>
                <tbody>
                  {data.summary.map((s, i) => (
                    <tr key={i}>
                      <td>{s.period_label}</td>
                      <td>{s.order_count}</td>
                      <td>₱{parseFloat(s.total_sales).toLocaleString('en-PH', { minimumFractionDigits:2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>}
    </div>
  );
}
