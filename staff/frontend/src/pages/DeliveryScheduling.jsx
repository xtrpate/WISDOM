import { useState, useEffect } from 'react';
import axios from 'axios';
import { Truck, Plus } from 'lucide-react';

export default function DeliveryScheduling() {
  const [deliveries, setDeliveries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ order_id: '', address: '', scheduled_date: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDeliveries = () => {
    axios.get('/api/pos/deliveries').then(r => setDeliveries(r.data));
  };

  useEffect(() => { fetchDeliveries(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await axios.post('/api/pos/deliveries', form);
      setSuccess(`Delivery scheduled! ${res.data.assigned_driver ? `Assigned to: ${res.data.assigned_driver.name}` : ''}`);
      setForm({ order_id: '', address: '', scheduled_date: '', notes: '' });
      setShowForm(false);
      fetchDeliveries();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule delivery.');
    } finally { setLoading(false); }
  };

  const statusColor = s => ({ scheduled:'badge-blue', in_transit:'badge-yellow', delivered:'badge-green', failed:'badge-red' }[s] || 'badge-gray');

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1>Delivery Scheduling</h1>
          <p>Schedule and track customer deliveries</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Schedule Delivery
        </button>
      </div>

      {success && <div style={{ background:'#e8f5e9', color:'#2e7d32', padding:'12px 16px', borderRadius:10, marginBottom:16, fontSize:14 }}>{success}</div>}
      {error && <div style={{ background:'#fce4ec', color:'#c62828', padding:'12px 16px', borderRadius:10, marginBottom:16, fontSize:14 }}>{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16, fontWeight: 700 }}>New Delivery Schedule</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Order ID *</label>
                <input type="number" placeholder="Enter order ID" value={form.order_id}
                  onChange={e => setForm({ ...form, order_id: e.target.value })} required />
              </div>
              <div className="form-field">
                <label>Scheduled Date & Time *</label>
                <input type="datetime-local" value={form.scheduled_date}
                  onChange={e => setForm({ ...form, scheduled_date: e.target.value })} required />
              </div>
              <div className="form-field full">
                <label>Delivery Address *</label>
                <input type="text" placeholder="Full delivery address" value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })} required />
              </div>
              <div className="form-field full">
                <label>Notes</label>
                <textarea rows={2} placeholder="Any delivery instructions..." value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Scheduling...' : '✓ Schedule Delivery'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 16, fontWeight: 700, display:'flex', alignItems:'center', gap:8 }}>
          <Truck size={18} /> All Deliveries
        </h3>
        {deliveries.length === 0
          ? <p style={{ color:'#aaa', fontSize:13, textAlign:'center', padding:20 }}>No deliveries scheduled.</p>
          : <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th><th>Customer</th><th>Address</th>
                  <th>Scheduled</th><th>Driver</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map(d => (
                  <tr key={d.id}>
                    <td><strong>{d.order_number}</strong></td>
                    <td>{d.walkin_customer_name || '—'}</td>
                    <td style={{ maxWidth: 200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.address}</td>
                    <td style={{ fontSize:12 }}>{d.scheduled_date ? new Date(d.scheduled_date).toLocaleString('en-PH') : '—'}</td>
                    <td>{d.driver_name || <span style={{ color:'#aaa' }}>Unassigned</span>}</td>
                    <td><span className={`badge ${statusColor(d.status)}`}>{d.status?.replace('_',' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
    </div>
  );
}
