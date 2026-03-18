import { useState, useEffect } from 'react';
import axios from 'axios';
import { CalendarClock, Plus } from 'lucide-react';

export default function AppointmentScheduling() {
  const [appointments, setAppointments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ order_id: '', purpose: 'site_measurement', scheduled_date: '', preferred_date: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAppointments = () => {
    axios.get('/api/pos/appointments').then(r => setAppointments(r.data));
  };

  useEffect(() => { fetchAppointments(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await axios.post('/api/pos/appointments', form);
      setSuccess(`Appointment scheduled! ${res.data.assigned_to ? `Assigned to: ${res.data.assigned_to.name}` : ''}`);
      setForm({ order_id: '', purpose: 'site_measurement', scheduled_date: '', preferred_date: '', notes: '' });
      setShowForm(false);
      fetchAppointments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule appointment.');
    } finally { setLoading(false); }
  };

  const statusColor = s => ({ pending:'badge-yellow', confirmed:'badge-blue', done:'badge-green', cancelled:'badge-red' }[s] || 'badge-gray');

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1>Appointment Scheduling</h1>
          <p>Schedule site measurements, installations, and consultations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> New Appointment
        </button>
      </div>

      {success && <div style={{ background:'#e8f5e9', color:'#2e7d32', padding:'12px 16px', borderRadius:10, marginBottom:16, fontSize:14 }}>{success}</div>}
      {error && <div style={{ background:'#fce4ec', color:'#c62828', padding:'12px 16px', borderRadius:10, marginBottom:16, fontSize:14 }}>{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16, fontWeight: 700 }}>New Appointment</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Order ID (optional)</label>
                <input type="number" placeholder="Linked order ID if any" value={form.order_id}
                  onChange={e => setForm({ ...form, order_id: e.target.value })} />
              </div>
              <div className="form-field">
                <label>Purpose *</label>
                <select value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} required>
                  <option value="site_measurement">Site Measurement</option>
                  <option value="installation">Installation</option>
                  <option value="consultation">Consultation</option>
                  <option value="delivery_check">Delivery Check</option>
                </select>
              </div>
              <div className="form-field">
                <label>Preferred Date (Customer)</label>
                <input type="datetime-local" value={form.preferred_date}
                  onChange={e => setForm({ ...form, preferred_date: e.target.value })} />
              </div>
              <div className="form-field">
                <label>Confirmed Date & Time *</label>
                <input type="datetime-local" value={form.scheduled_date}
                  onChange={e => setForm({ ...form, scheduled_date: e.target.value })} required />
              </div>
              <div className="form-field full">
                <label>Notes</label>
                <textarea rows={2} placeholder="Additional appointment details..." value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <p style={{ fontSize:12, color:'#888', marginTop:8 }}>
              * A cabinet maker/installer will be auto-assigned based on availability.
            </p>
            <div style={{ display:'flex', gap:10, marginTop:14 }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Scheduling...' : '✓ Schedule Appointment'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 16, fontWeight: 700, display:'flex', alignItems:'center', gap:8 }}>
          <CalendarClock size={18} /> Appointments
        </h3>
        {appointments.length === 0
          ? <p style={{ color:'#aaa', fontSize:13, textAlign:'center', padding:20 }}>No appointments scheduled.</p>
          : <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th><th>Purpose</th><th>Scheduled</th>
                  <th>Preferred</th><th>Assigned To</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(a => (
                  <tr key={a.id}>
                    <td>{a.order_number || <span style={{ color:'#aaa' }}>—</span>}</td>
                    <td style={{ textTransform:'capitalize' }}>{a.purpose?.replace('_',' ')}</td>
                    <td style={{ fontSize:12 }}>{a.scheduled_date ? new Date(a.scheduled_date).toLocaleString('en-PH') : '—'}</td>
                    <td style={{ fontSize:12, color:'#888' }}>{a.preferred_date ? new Date(a.preferred_date).toLocaleString('en-PH') : '—'}</td>
                    <td>{a.assigned_to_name || <span style={{ color:'#aaa' }}>Unassigned</span>}</td>
                    <td><span className={`badge ${statusColor(a.status)}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
    </div>
  );
}
