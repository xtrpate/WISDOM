import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Search, Barcode, ShoppingCart, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './ProductSearch.css';

export default function ProductSearch() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const barcodeRef = useRef(null);

  const searchProducts = useCallback(async (q) => {
    if (!q.trim()) { setProducts([]); return; }
    setSearching(true);
    try {
      const res = await axios.get(`/api/pos/products?q=${encodeURIComponent(q)}`);
      setProducts(res.data);
    } catch { setProducts([]); }
    setSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchProducts(query), 350);
    return () => clearTimeout(t);
  }, [query, searchProducts]);

  const addToCart = (product, variation = null) => {
    const key = variation ? `${product.id}-${variation.id}` : `${product.id}`;
    setCart(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        key,
        product_id: product.id,
        variation_id: variation?.id || null,
        product_name: variation
          ? `${product.name} (${variation.variation_name})`
          : product.name,
        unit_price: variation?.selling_price || product.walkin_price,
        production_cost: variation?.unit_cost ?? product.production_cost ?? 0,
        quantity: 1,
        max_stock: variation?.stock || product.stock
      }];
    });
  };

  const updateQty = (key, delta) => {
    setCart(prev => prev.map(i => {
      if (i.key !== key) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > i.max_stock) return i;
      return { ...i, quantity: newQty };
    }).filter(Boolean));
  };

  const removeItem = (key) => setCart(prev => prev.filter(i => i.key !== key));

  const cartTotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  const proceedToCheckout = () => {
    sessionStorage.setItem('pos_cart', JSON.stringify(cart));
    navigate('/order');
  };

  return (
    <div className="search-layout">
      {/* Left: Products */}
      <div className="search-panel">
        <div className="page-header">
          <h1>Product Search & Cart</h1>
          <p>Search by product name or scan barcode</p>
        </div>

        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search products by name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="search-results">
          {searching && <p className="search-hint">Searching...</p>}
          {!searching && query && products.length === 0 && (
            <p className="search-hint">No products found for "{query}"</p>
          )}
          {!query && <p className="search-hint">Type a product name to search, or scan a barcode above.</p>}

          <div className="product-grid">
            {products.map(product => (
              <div key={product.id} className="product-card">
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} className="product-img" />
                  : <div className="product-img-placeholder">📦</div>
                }
                <div className="product-info">
                  <div className="product-name">{product.name}</div>
                  <div className="product-category">{product.category}</div>
                  <div className="product-price">₱{parseFloat(product.walkin_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                  <div className={`badge ${product.stock_status === 'in_stock' ? 'badge-green' : product.stock_status === 'low_stock' ? 'badge-yellow' : 'badge-red'}`} style={{ fontSize: 11 }}>
                    {product.stock_status.replace('_', ' ')} ({product.stock})
                  </div>
                </div>

                {product.variations && product.variations.length > 0 ? (
                  <div className="variation-list">
                    {product.variations.map(v => (
                      <button
                        key={v.id}
                        className="var-btn"
                        onClick={() => addToCart(product, v)}
                        disabled={v.stock <= 0}
                      >
                        <span>{v.variation_name}</span>
                        <span>₱{parseFloat(v.selling_price).toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    className="add-btn"
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                  >
                    <Plus size={16} /> Add to Cart
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="cart-panel">
        <div className="cart-header">
          <ShoppingCart size={20} />
          <span>Cart ({cart.length} items)</span>
        </div>

        {cart.length === 0
          ? <div className="cart-empty">Cart is empty.<br />Search and add products.</div>
          : <>
              <div className="cart-items">
                {cart.map(item => (
                  <div key={item.key} className="cart-item">
                    <div className="cart-item-name">{item.product_name}</div>
                    <div className="cart-item-price">
                      ₱{(item.unit_price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="cart-item-controls">
                      <button onClick={() => updateQty(item.key, -1)}><Minus size={13} /></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQty(item.key, 1)}><Plus size={13} /></button>
                      <button className="remove-btn" onClick={() => removeItem(item.key)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <div className="cart-total">
                  <span>Total</span>
                  <span>₱{cartTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <button className="btn btn-primary checkout-btn" onClick={proceedToCheckout}>
                  Proceed to Checkout <ArrowRight size={16} />
                </button>
              </div>
            </>
        }
      </div>
    </div>
  );
}
