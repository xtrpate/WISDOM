import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const DELIVERY_STATUSES = ['scheduled', 'in_transit', 'delivered', 'failed'];

const ALLOWED_TRANSITIONS = {
  scheduled: ['scheduled', 'in_transit'],
  in_transit: ['in_transit', 'delivered', 'failed'],
  delivered: ['delivered'],
  failed: ['failed']
};

const getAllowedStatuses = (currentStatus = 'scheduled') =>
  ALLOWED_TRANSITIONS[currentStatus] || [currentStatus];

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatStatus = (value) => {
  if (!value) return '—';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function DeliveryManagement() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState('');
  const [success, setSuccess] = useState('');

  const loadDeliveries = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.get('/api/pos/deliveries');
      const list = Array.isArray(res.data) ? res.data : [];

      setDeliveries(list);

      const nextDrafts = {};
      list.forEach((item) => {
        nextDrafts[item.id] = item.status || 'scheduled';
      });
      setDrafts(nextDrafts);
    } catch (err) {
      console.error('Delivery load error:', err?.response?.data || err);
      setError(
        err?.response?.data?.message ||
          `Failed to load deliveries.${err?.response?.status ? ` (HTTP ${err.response.status})` : ''}`
      );
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  const handleDraftChange = (id, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSave = async (delivery) => {
    const selectedStatus = drafts[delivery.id] || delivery.status || 'scheduled';

    if (selectedStatus === delivery.status) {
        setSuccess('No status change to save.');
        return;
    }

    setSavingId(delivery.id);
    setError('');
    setSuccess('');

    try {
        await axios.patch(`/api/pos/deliveries/${delivery.id}/status`, {
        status: selectedStatus,
        notes: delivery.notes ?? null
        });

        setSuccess('Delivery status updated successfully.');

        await loadDeliveries();
    } catch (err) {
    console.error('Delivery update error:', err?.response?.data || err);

        setDrafts((prev) => ({
        ...prev,
        [delivery.id]: delivery.status || 'scheduled'
        }));

        setError(
        err?.response?.data?.message ||
            `Failed to update delivery status.${err?.response?.status ? ` (HTTP ${err.response.status})` : ''}`
        );
    } finally {
        setSavingId(null);
    }
  };

  const filteredDeliveries = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return deliveries;

    return deliveries.filter((item) => {
      return [
        String(item.order_number || ''),
        String(item.customer_name || ''),
        String(item.address || ''),
        String(item.status || '')
      ].some((field) => field.toLowerCase().includes(keyword));
    });
  }, [deliveries, search]);

  return (
    <div style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Delivery Management</h2>
          <p style={{ margin: '6px 0 0', color: '#666' }}>
            View and update delivery statuses.
          </p>
        </div>

        <button
          onClick={loadDeliveries}
          disabled={loading}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #d0d0d0',
            background: '#fff',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}
      >
        <input
          type="text"
          placeholder="Search by order, customer, address, or status"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            outline: 'none'
          }}
        />
      </div>
       
       {error && (
        <div
            style={{
            marginBottom: '16px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c'
            }}
        >
            {error}
        </div>
        )}
      {success && (
        <div
            style={{
            marginBottom: '16px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: '#ecfdf5',
            border: '1px solid #bbf7d0',
            color: '#166534'
            }}
        >
            {success}
        </div>
       )}

      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <div style={{ padding: '20px' }}>Loading deliveries...</div>
        ) : filteredDeliveries.length === 0 ? (
          <div style={{ padding: '20px' }}>No deliveries found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '900px'
              }}
            >
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={thStyle}>Order</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Address</th>
                  <th style={thStyle}>Scheduled</th>
                  <th style={thStyle}>Current Status</th>
                  <th style={thStyle}>Update Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td style={tdStyle}>{delivery.order_number || '—'}</td>
                    <td style={tdStyle}>{delivery.customer_name || '—'}</td>
                    <td style={tdStyle}>{delivery.address || '—'}</td>
                    <td style={tdStyle}>{formatDateTime(delivery.scheduled_date)}</td>
                    <td style={tdStyle}>
                      <span style={statusBadgeStyle}>{formatStatus(delivery.status)}</span>
                    </td>
                    <td style={tdStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <select
                            value={drafts[delivery.id] || delivery.status || 'scheduled'}
                            onChange={(e) => handleDraftChange(delivery.id, e.target.value)}
                            style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                minWidth: '160px'
                            }}
                            >
                            {getAllowedStatuses(delivery.status).map((status) => (
                            <option key={status} value={status}>
                                {formatStatus(status)}
                            </option>
                            ))}
                            </select>

                            <small style={{ color: '#6b7280' }}>
                             Selected: {formatStatus(drafts[delivery.id] || delivery.status || 'scheduled')}
                            </small>
                        </div>
                        </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleSave(delivery)}
                        disabled={
                            savingId === delivery.id ||
                            (drafts[delivery.id] || delivery.status || 'scheduled') === delivery.status
                        }
                        style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            background:
                            savingId === delivery.id ||
                            (drafts[delivery.id] || delivery.status || 'scheduled') === delivery.status
                                ? '#9ca3af'
                                : '#111827',
                            color: '#fff',
                            cursor:
                            savingId === delivery.id ||
                            (drafts[delivery.id] || delivery.status || 'scheduled') === delivery.status
                                ? 'not-allowed'
                                : 'pointer'
                        }}
                        >
                        {savingId === delivery.id ? 'Saving...' : 'Save'}
                        </button>
                    </td>
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

const thStyle = {
  textAlign: 'left',
  padding: '14px 16px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '14px',
  fontWeight: 600,
  color: '#374151'
};

const tdStyle = {
  padding: '14px 16px',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'top',
  fontSize: '14px'
};

const statusBadgeStyle = {
  display: 'inline-block',
  padding: '6px 10px',
  borderRadius: '999px',
  background: '#f3f4f6',
  fontSize: '12px',
  fontWeight: 600
};