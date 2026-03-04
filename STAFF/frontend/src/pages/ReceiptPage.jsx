import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import './ReceiptPage.css';

export default function ReceiptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/pos/receipts/${id}`).then(r => {
      setReceipt(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-screen">Loading receipt...</div>;
  if (!receipt) return <div className="page-header"><p>Receipt not found.</p></div>;

  const items = Array.isArray(receipt.items) ? receipt.items : [];

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1>Official Receipt</h1>
          <p>Receipt #{receipt.receipt_number}</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Print Receipt
          </button>
        </div>
      </div>

      <div className="receipt-wrapper">
        <div className="receipt" id="receipt-print">
          {/* Header */}
          <div className="receipt-header">
            {receipt.business?.site_logo && (
              <img src={receipt.business.site_logo} alt="logo" className="receipt-logo" />
            )}
            <h2 className="biz-name">{receipt.business?.business_name || 'Spiral Wood Services'}</h2>
            <p className="biz-info">{receipt.business?.business_address || ''}</p>
            <p className="biz-info">{receipt.business?.business_phone || ''}</p>
            <div className="receipt-divider" />
            <p className="receipt-title">OFFICIAL RECEIPT</p>
          </div>

          {/* Meta */}
          <div className="receipt-meta">
            <div className="meta-row">
              <span>Receipt #:</span>
              <span>{receipt.receipt_number}</span>
            </div>
            <div className="meta-row">
              <span>Order #:</span>
              <span>{receipt.order_number}</span>
            </div>
            <div className="meta-row">
              <span>Date:</span>
              <span>{new Date(receipt.created_at).toLocaleString('en-PH')}</span>
            </div>
            <div className="meta-row">
              <span>Issued to:</span>
              <span>{receipt.issued_to}</span>
            </div>
            <div className="meta-row">
              <span>Payment:</span>
              <span style={{ textTransform:'capitalize' }}>{receipt.payment_method?.replace('_',' ')}</span>
            </div>
            {receipt.walkin_customer_phone && (
              <div className="meta-row">
                <span>Phone:</span>
                <span>{receipt.walkin_customer_phone}</span>
              </div>
            )}
            <div className="meta-row">
              <span>Cashier:</span>
              <span>{receipt.staff_name}</span>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Items */}
          <table className="receipt-items">
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign:'center' }}>Qty</th>
                <th style={{ textAlign:'right' }}>Price</th>
                <th style={{ textAlign:'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>{item.product_name}</td>
                  <td style={{ textAlign:'center' }}>{item.quantity}</td>
                  <td style={{ textAlign:'right' }}>₱{parseFloat(item.unit_price).toLocaleString('en-PH', { minimumFractionDigits:2 })}</td>
                  <td style={{ textAlign:'right' }}>₱{(item.unit_price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits:2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="receipt-divider" />

          {/* Totals */}
          <div className="receipt-totals">
            <div className="total-row">
              <span>Subtotal</span>
              <span>₱{parseFloat(receipt.subtotal || 0).toLocaleString('en-PH', { minimumFractionDigits:2 })}</span>
            </div>
            {receipt.discount > 0 && (
              <div className="total-row" style={{ color:'#2e7d32' }}>
                <span>Discount</span>
                <span>-₱{parseFloat(receipt.discount).toLocaleString('en-PH', { minimumFractionDigits:2 })}</span>
              </div>
            )}
            <div className="total-row grand">
              <span>TOTAL</span>
              <span>₱{parseFloat(receipt.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits:2 })}</span>
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Footer */}
          <div className="receipt-footer">
            {receipt.signature_url && (
              <div className="signature-block">
                <img src={receipt.signature_url} alt="Signature" className="signature-img" />
                <div className="signature-label">Authorized Signature</div>
              </div>
            )}
            <p>Thank you for your purchase!</p>
            <p style={{ fontSize:11, color:'#aaa', marginTop:4 }}>
              This is your official receipt. Items sold are non-refundable unless covered by warranty.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
