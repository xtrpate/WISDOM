import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Receipt } from 'lucide-react';

export default function ProcessOrder() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    payment_method: 'cash',
    discount: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('pos_cart');
    if (saved) setCart(JSON.parse(saved));
  }, []);

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const discount = parseFloat(form.discount) || 0;
  const total = subtotal - discount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return setError('Cart is empty.');
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/pos/orders', {
        ...form,
        items: cart,
        discount
      });
      sessionStorage.removeItem('pos_cart');
      setSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process order.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
        <div className="card" style={{ maxWidth: 460, width:'100%', textAlign:'center', padding: 40 }}>
          <CheckCircle size={56} color="#2e7d32" style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#1a1a2e', marginBottom: 8 }}>Order Successful!</h2>
          <p style={{ color: '#666', marginBottom: 6 }}>Order #: <strong>{success.order_number}</strong></p>
          <p style={{ color: '#666', marginBottom: 6 }}>Receipt #: <strong>{success.receipt_number}</strong></p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#8B4513', marginBottom: 24 }}>
            ₱{parseFloat(success.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
            <button className="btn btn-primary" onClick={() => navigate(`/receipt/${success.receipt_id}`)}>
              <Receipt size={16} /> View Receipt
            </button>
            <button className="btn btn-secondary" onClick={() => { setSuccess(null); setCart([]); navigate('/products'); }}>
              New Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div>
        <div className="page-header"><h1>Process Order & Payment</h1></div>
        <div className="card" style={{ textAlign:'center', padding: 40 }}>
          <p style={{ color:'#aaa' }}>No items in cart. <button className="btn btn-secondary" onClick={() => navigate('/products')}>Go to Product Search</button></p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Process Order & Payment</h1>
        <p>Review cart and complete payment for walk-in customer</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20 }}>
        {/* Order Form */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Customer & Payment Details</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Customer Name</label>
                <input
                  type="text"
                  placeholder="Walk-in Customer"
                  value={form.customer_name}
                  onChange={e => setForm({ ...form, customer_name: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Phone Number</label>
                <input
                  type="tel"
                  placeholder="09XXXXXXXXX"
                  value={form.customer_phone}
                  onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Payment Method *</label>
                <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} required>
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cod">Cash on Delivery (COD)</option>
                  <option value="cop">Cash on Pick-up (COP)</option>
                </select>
              </div>
              <div className="form-field">
                <label>Discount (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount}
                  onChange={e => setForm({ ...form, discount: e.target.value })}
                />
              </div>
              <div className="form-field full">
                <label>Notes / Special Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Any special notes..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            {error && <div style={{ background:'#fce4ec', color:'#c62828', padding:'10px 14px', borderRadius:8, fontSize:13, marginTop:16 }}>{error}</div>}

            <div style={{ display:'flex', gap:12, marginTop:20 }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/products')}>
                ← Back to Cart
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Processing...' : '✓ Confirm Order & Process Payment'}
              </button>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div className="card" style={{ height:'fit-content' }}>
          <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Order Summary</h3>
          <div style={{ maxHeight: 280, overflowY:'auto' }}>
            {cart.map(item => (
              <div key={item.key} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f0f0f0', fontSize:13 }}>
                <div>
                  <div style={{ fontWeight:600 }}>{item.product_name}</div>
                  <div style={{ color:'#888' }}>x{item.quantity} @ ₱{item.unit_price.toLocaleString()}</div>
                </div>
                <div style={{ fontWeight:700 }}>₱{(item.unit_price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:16, borderTop:'2px solid #f0f0f0', paddingTop:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
              <span>Subtotal</span>
              <span>₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>
            {discount > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6, color:'#2e7d32' }}>
                <span>Discount</span>
                <span>-₱{discount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:18, fontWeight:800, color:'#8B4513', marginTop:8 }}>
              <span>TOTAL</span>
              <span>₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
