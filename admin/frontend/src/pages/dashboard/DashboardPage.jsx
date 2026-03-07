// src/pages/dashboard/DashboardPage.jsx – Full date presets + error handling
import React, { useEffect, useState, useCallback } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend,
} from 'chart.js';
import api from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

// ── Date presets ─────────────────────────────────────────────────────────────
const PRESETS = [
  { key: 'today',    label: 'Today' },
  { key: 'yesterday',label: 'Yesterday' },
  { key: 'week',     label: 'This Week' },
  { key: 'last7',    label: 'Last 7 Days' },
  { key: 'month',    label: 'This Month' },
  { key: 'last30',   label: 'Last 30 Days' },
  { key: 'year',     label: 'This Year' },
  { key: 'last12m',  label: 'Last 12 Months' },
  { key: 'custom',   label: 'Custom Range' },
];

function KPI({ label, value, sub, color }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, padding:'18px 20px', borderLeft:`4px solid ${color}`, boxShadow:'0 1px 6px rgba(0,0,0,.08)' }}>
      <p style={{ fontSize:11, color:'#64748b', margin:0, textTransform:'uppercase', letterSpacing:.5 }}>{label}</p>
      <p style={{ fontSize:26, fontWeight:700, color:'#1e2a38', margin:'4px 0' }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [preset,  setPreset]  = useState('last30');
  const [from,    setFrom]    = useState('');
  const [to,      setTo]      = useState('');

  const load = useCallback(async (p = preset, f = from, t = to) => {
    setLoading(true);
    setError(null);
    try {
      const params = p === 'custom' ? { from: f, to: t } : { preset: p };
      const res = await api.get('/dashboard', { params });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load dashboard. Check your server connection.');
    } finally {
      setLoading(false);
    }
  }, [preset, from, to]);

  useEffect(() => { load('last30'); }, []); // eslint-disable-line

  const handlePreset = (key) => {
    setPreset(key);
    if (key !== 'custom') load(key, '', '');
  };

  const handleCustomApply = () => {
    if (!from || !to) return;
    if (from > to) { setError('Start date must be before end date.'); return; }
    load('custom', from, to);
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, gap:12, color:'#64748b' }}>
      <div style={{ width:24, height:24, border:'3px solid #e2e8f0', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      Loading dashboard…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:24, color:'#991b1b', maxWidth:600, margin:'40px auto' }}>
      <strong>⚠ Dashboard Error</strong>
      <p style={{ margin:'8px 0 16px', fontSize:14 }}>{error}</p>
      <button onClick={() => load()} style={{ padding:'7px 18px', background:'#ef4444', color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}>
        Retry
      </button>
    </div>
  );

  if (!data) return null;

  const { inventory, orders, sales, salesChart, topProducts, recentOrders, dateRange } = data;

  const chartData = {
    labels: salesChart.map(r => r.date),
    datasets: [
      { label:'Online Sales',  data: salesChart.map(r => Number(r.online_sales)), borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,.1)', tension:0.4, fill:true },
      { label:'Walk-in Sales', data: salesChart.map(r => Number(r.walkin_sales)),  borderColor:'#10b981', backgroundColor:'rgba(16,185,129,.1)', tension:0.4, fill:true },
    ],
  };

  const topBarData = {
    labels: topProducts.slice(0,8).map(p => p.product_name?.slice(0,22) || '—'),
    datasets: [{ label:'Units Sold', data: topProducts.slice(0,8).map(p => p.units_sold), backgroundColor:'#6366f1', borderRadius:4 }],
  };

  const activeLabel = PRESETS.find(p => p.key === preset)?.label || 'Custom';

  return (
    <div>
      {/* ── Header + Date Controls ─────────────────────────────────────────── */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:'#1e2a38', margin:0 }}>Dashboard</h1>
            <p style={{ fontSize:12, color:'#64748b', margin:'4px 0 0' }}>
              Showing data for: <strong>{activeLabel}</strong>
              {dateRange && ` (${dateRange.from} → ${dateRange.to})`}
            </p>
          </div>
          <button onClick={() => load()} style={{ ...S.btnGhost, fontSize:12, padding:'6px 14px' }}>↻ Refresh</button>
        </div>

        {/* Preset Pills */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:12 }}>
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => handlePreset(p.key)}
              style={{
                padding:'5px 14px', border:'1px solid', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:500,
                background: preset===p.key ? '#1e40af' : '#fff',
                color:      preset===p.key ? '#fff' : '#374151',
                borderColor:preset===p.key ? '#1e40af' : '#d1d5db',
              }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Range Inputs */}
        {preset === 'custom' && (
          <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:10, flexWrap:'wrap' }}>
            <label style={{ fontSize:12, color:'#374151', fontWeight:500 }}>From:</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={S.dateInput}/>
            <label style={{ fontSize:12, color:'#374151', fontWeight:500 }}>To:</label>
            <input type="date" value={to}   onChange={e => setTo(e.target.value)}   style={S.dateInput}/>
            <input type="time" value="" onChange={() => {}} style={{ ...S.dateInput, width:110 }} placeholder="Start time" title="Optional time filter"/>
            <button onClick={handleCustomApply} disabled={!from || !to} style={S.btnPrimary}>Apply</button>
            {error && <span style={{ fontSize:12, color:'#ef4444' }}>{error}</span>}
          </div>
        )}
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px,1fr))', gap:14, marginBottom:24 }}>
        <KPI label="Total Revenue"     value={`₱ ${Number(sales.total_revenue).toLocaleString('en-PH')}`} color="#3b82f6"/>
        <KPI label="Total Profit"      value={`₱ ${Number(sales.total_profit).toLocaleString('en-PH')}`}  color="#10b981"/>
        <KPI label="Total Orders"      value={orders.total_orders || 0}                                    color="#8b5cf6" sub={`${orders.completed_orders || 0} completed`}/>
        <KPI label="Pending Orders"    value={orders.pending_orders || 0}                                  color="#f59e0b"/>
        <KPI label="Total Products"    value={inventory.total_products || 0}                               color="#06b6d4" sub={`${inventory.out_of_stock_count || 0} out of stock`}/>
        <KPI label="Low Stock Items"   value={inventory.low_stock_count || 0}                              color="#ef4444"/>
        <KPI label="Avg Order Value"   value={`₱ ${Number(sales.avg_order_value || 0).toFixed(0)}`}       color="#84cc16"/>
        <KPI label="Online / Walk-in"  value={`${sales.online_orders || 0} / ${sales.walkin_orders || 0}`} color="#f97316" sub="orders by channel"/>
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:18, marginBottom:22 }}>
        <div style={S.card}>
          <h3 style={S.cardTitle}>Sales Trend — Online vs Walk-in</h3>
          {salesChart.length === 0
            ? <p style={{ color:'#94a3b8', fontSize:13, textAlign:'center', padding:30 }}>No sales data for this period.</p>
            : <Line data={chartData} options={{ responsive:true, plugins:{ legend:{ position:'top' } }, scales:{ y:{ beginAtZero:true } } }}/>
          }
        </div>
        <div style={S.card}>
          <h3 style={S.cardTitle}>Top Products by Units Sold</h3>
          {topProducts.length === 0
            ? <p style={{ color:'#94a3b8', fontSize:13, textAlign:'center', padding:30 }}>No product data for this period.</p>
            : <Bar data={topBarData} options={{ responsive:true, indexAxis:'y', plugins:{ legend:{ display:false } }, scales:{ x:{ beginAtZero:true } } }}/>
          }
        </div>
      </div>

      {/* ── Recent Orders ─────────────────────────────────────────────────── */}
      <div style={S.card}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #f1f5f9', background:'#f8fafc', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#1e2a38' }}>Recent Orders</h3>
          <span style={{ fontSize:12, color:'#94a3b8' }}>{recentOrders.length} orders in period</span>
        </div>
        {recentOrders.length === 0 ? (
          <p style={{ color:'#94a3b8', fontSize:13, textAlign:'center', padding:32 }}>No orders in this date range.</p>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {['Order ID','Customer','Channel','Amount','Status','Date & Time'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ ...S.td, fontWeight:700, color:'#1e40af' }}>#{o.id}</td>
                    <td style={S.td}>{o.customer_name}</td>
                    <td style={S.td}>
                      <span style={badge(o.channel==='online' ? '#dbeafe':'#dcfce7', o.channel==='online' ? '#1e40af':'#166534')}>
                        {o.channel}
                      </span>
                    </td>
                    <td style={{ ...S.td, fontWeight:600 }}>₱ {Number(o.total_amount || 0).toLocaleString('en-PH')}</td>
                    <td style={S.td}><StatusBadge status={o.status}/></td>
                    <td style={{ ...S.td, fontSize:12, color:'#64748b' }}>{new Date(o.created_at).toLocaleString('en-PH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:    ['#fef9c3','#854d0e'],
    confirmed:  ['#dbeafe','#1e40af'],
    production: ['#e9d5ff','#6b21a8'],
    shipping:   ['#e0f2fe','#075985'],
    delivered:  ['#dcfce7','#166534'],
    completed:  ['#d1fae5','#065f46'],
    cancelled:  ['#fee2e2','#991b1b'],
  };
  const [bg, color] = map[status] || ['#f1f5f9','#475569'];
  return <span style={badge(bg, color)}>{status}</span>;
}

const badge = (bg, c) => ({ background:bg, color:c, padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600 });

const S = {
  card:      { background:'#fff', borderRadius:12, boxShadow:'0 1px 6px rgba(0,0,0,.08)', overflow:'hidden' },
  cardTitle: { fontSize:14, fontWeight:600, color:'#1e2a38', marginTop:0, marginBottom:14, padding:'16px 20px 0' },
  th:        { textAlign:'left', padding:'10px 14px', fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase' },
  td:        { padding:'10px 14px', color:'#374151' },
  dateInput: { padding:'6px 10px', border:'1px solid #d1d5db', borderRadius:6, fontSize:12 },
  btnPrimary:{ padding:'6px 18px', background:'#1e40af', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600 },
  btnGhost:  { padding:'6px 16px', background:'#f1f5f9', color:'#374151', border:'1px solid #e2e8f0', borderRadius:6, cursor:'pointer', fontSize:12 },
};
