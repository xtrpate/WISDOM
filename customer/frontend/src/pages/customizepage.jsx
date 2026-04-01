/**
 * pages/customizepage.jsx
 * Browse blueprint/custom products and add to custom cart with options
 */
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Search, Scissors, ShoppingBag } from "lucide-react";
import { useCustomCart } from "../context/customcartcontext";
import "./customizepage.css";

const API = "http://localhost:5000";

const WOOD_TYPES = [
  "Oak",
  "Pine",
  "Walnut",
  "Mahogany",
  "Maple",
  "Plywood",
  "MDF",
];
const COLORS = [
  "Natural",
  "White",
  "Black",
  "Brown",
  "Dark Walnut",
  "Light Oak",
  "Custom (see comments)",
];
const DOOR_STYLES = [
  "Flat Panel",
  "Raised Panel",
  "Shaker",
  "Louvered",
  "Glass Panel",
  "Open (No Door)",
];
const HARDWARE = [
  "Silver Handles",
  "Gold Handles",
  "Black Handles",
  "Knobs",
  "Concealed Hinges",
  "Exposed Hinges",
  "No Hardware",
];

/* ── Image with fallback ── */
const ProductImage = ({ src, alt }) => {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="cust-img-placeholder">
        <span>🪵</span>
        <small>{alt}</small>
      </div>
    );
  }
  return (
    <img
      src={`${API}/${src}`}
      alt={alt}
      className="cust-product-img"
      onError={() => setErr(true)}
    />
  );
};

/* ── Skeleton ── */
const Skeleton = () => (
  <div className="product-skeleton">
    <div className="skeleton-img" />
    <div className="skeleton-body">
      <div className="skeleton-line short" />
      <div className="skeleton-line medium" />
      <div className="skeleton-line" />
    </div>
  </div>
);

/* ══════════════════════════════════════
   Customization Modal
══════════════════════════════════════ */
function CustomizeModal({ product, onClose, onAdd }) {
  const [form, setForm] = useState({
    wood_type: "",
    color: "",
    door_style: "",
    hardware: "",
    width: "",
    height: "",
    depth: "",
    comments: "",
    quantity: 1,
  });
  const [added, setAdded] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleAdd = () => {
    onAdd(product, form);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box modal-box-wide cust-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="cust-modal-body">
          {/* Left: product image */}
          <div className="cust-modal-img-side">
            <div className="cust-modal-img-wrap">
              <ProductImage src={product.image_url} alt={product.name} />
            </div>
            <div className="cust-modal-product-name">{product.name}</div>
            {product.category && (
              <div className="cust-modal-category">{product.category}</div>
            )}
          </div>

          {/* Right: customization form */}
          <div className="cust-modal-form-side">
            <h2 className="cust-modal-title">Customize This Item</h2>
            <p className="cust-modal-subtitle">
              Fill in your preferred specifications below
            </p>

            <div className="cust-form-grid">
              {/* Wood Type */}
              <div className="cust-field">
                <label className="cust-label">🪵 Wood Type</label>
                <select
                  className="cust-select"
                  value={form.wood_type}
                  onChange={(e) => set("wood_type", e.target.value)}
                >
                  <option value="">— Select wood type —</option>
                  {WOOD_TYPES.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color / Finish */}
              <div className="cust-field">
                <label className="cust-label">🎨 Color / Finish</label>
                <select
                  className="cust-select"
                  value={form.color}
                  onChange={(e) => set("color", e.target.value)}
                >
                  <option value="">— Select color/finish —</option>
                  {COLORS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Door Style */}
              <div className="cust-field">
                <label className="cust-label">🚪 Door Style</label>
                <select
                  className="cust-select"
                  value={form.door_style}
                  onChange={(e) => set("door_style", e.target.value)}
                >
                  <option value="">— Select door style —</option>
                  {DOOR_STYLES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hardware */}
              <div className="cust-field">
                <label className="cust-label">🔩 Hardware</label>
                <select
                  className="cust-select"
                  value={form.hardware}
                  onChange={(e) => set("hardware", e.target.value)}
                >
                  <option value="">— Select hardware —</option>
                  {HARDWARE.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dimensions */}
            <div className="cust-field">
              <label className="cust-label">
                📐 Dimensions (cm){" "}
                <span className="cust-optional">optional</span>
              </label>
              <div className="cust-dim-row">
                <div className="cust-dim-field">
                  <input
                    className="cust-input"
                    type="number"
                    placeholder="Width"
                    min="0"
                    value={form.width}
                    onChange={(e) => set("width", e.target.value)}
                  />
                  <span className="cust-dim-label">W</span>
                </div>
                <span className="cust-dim-sep">×</span>
                <div className="cust-dim-field">
                  <input
                    className="cust-input"
                    type="number"
                    placeholder="Height"
                    min="0"
                    value={form.height}
                    onChange={(e) => set("height", e.target.value)}
                  />
                  <span className="cust-dim-label">H</span>
                </div>
                <span className="cust-dim-sep">×</span>
                <div className="cust-dim-field">
                  <input
                    className="cust-input"
                    type="number"
                    placeholder="Depth"
                    min="0"
                    value={form.depth}
                    onChange={(e) => set("depth", e.target.value)}
                  />
                  <span className="cust-dim-label">D</span>
                </div>
              </div>
            </div>

            {/* Quantity */}
            <div className="cust-field">
              <label className="cust-label">🔢 Quantity</label>
              <div className="cust-qty-row">
                <button
                  className="cust-qty-btn"
                  onClick={() =>
                    set("quantity", Math.max(1, form.quantity - 1))
                  }
                >
                  −
                </button>
                <span className="cust-qty-val">{form.quantity}</span>
                <button
                  className="cust-qty-btn"
                  onClick={() => set("quantity", form.quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Comments */}
            <div className="cust-field">
              <label className="cust-label">
                💬 Additional Comments{" "}
                <span className="cust-optional">optional</span>
              </label>
              <textarea
                className="cust-textarea"
                placeholder="Any other specifications, special requests, or notes for our team…"
                value={form.comments}
                onChange={(e) => set("comments", e.target.value)}
                rows={3}
                maxLength={500}
              />
              <div className="cust-char">{form.comments.length}/500</div>
            </div>

            <button
              className={`cust-add-btn ${added ? "cust-added" : ""}`}
              onClick={handleAdd}
            >
              <Scissors size={16} />
              {added ? "Added to Custom Cart!" : "Add to Custom Cart"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   Main Page
══════════════════════════════════════ */
export default function CustomizePage() {
  const { addToCustomCart, customCartCount } = useCustomCart();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState("");

  const fetchProducts = useCallback(
    async (q = search) => {
      setLoading(true);
      try {
        const res = await axios.get("/api/customer/products", {
          params: { type: "blueprint", q: q || undefined, limit: 50 },
        });
        setProducts(res.data.products || []);
        setTotal(res.data.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts(search);
  };

  const handleAdd = (product, form) => {
    addToCustomCart({
      key: `custom_${product.id}_${Date.now()}`,
      product_id: product.id,
      product_name: product.name,
      image_url: product.image_url,
      item_type: "custom",
      quantity: form.quantity,
      unit_price: 0, // price TBD by admin
      // customization specs
      wood_type: form.wood_type,
      color: form.color,
      door_style: form.door_style,
      hardware: form.hardware,
      width: form.width,
      height: form.height,
      depth: form.depth,
      comments: form.comments,
    });
    setToast(`"${product.name}" added to custom cart!`);
    setTimeout(() => setToast(""), 2500);
  };

  return (
    <div className="cust-page">
      {/* Toast */}
      {toast && (
        <div className="cart-toast">
          <Scissors size={14} /> {toast}
        </div>
      )}

      {/* Hero */}
      <div className="cust-hero">
        <div>
          <h1>Customize Your Order</h1>
          <p>Pick a design and tell us exactly how you want it built</p>
        </div>
        <a href="/custom-cart" className="cust-cart-btn">
          <Scissors size={16} />
          Custom Cart
          {customCartCount > 0 && (
            <span className="cust-cart-badge">{customCartCount}</span>
          )}
        </a>
      </div>

      {/* Search */}
      <div className="cust-search-bar">
        <form onSubmit={handleSearch} className="cust-search-form">
          <Search size={16} className="cust-search-icon" />
          <input
            type="text"
            className="cust-search-input"
            placeholder="Search custom products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="cust-search-btn">
            Search
          </button>
        </form>
        {!loading && (
          <span className="cust-count">
            {total} design{total !== 1 ? "s" : ""} available
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="cust-grid-wrap">
        {loading ? (
          <div className="products-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="catalog-empty">
            <div style={{ fontSize: 48 }}>🪵</div>
            <h3>No custom products found</h3>
            <p>Try a different search term.</p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map((p) => (
              <div key={p.id} className="product-card">
                <div
                  className="product-card-img"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelected(p)}
                >
                  <ProductImage src={p.image_url} alt={p.name} />
                  <div className="product-card-badges">
                    <span className="badge badge-blue">Custom</span>
                  </div>
                </div>
                <div className="product-card-body">
                  {p.category && (
                    <div className="product-card-category">{p.category}</div>
                  )}
                  <div className="product-card-name">{p.name}</div>
                  {p.description && (
                    <div className="product-card-desc">{p.description}</div>
                  )}
                  <div className="product-card-footer">
                    <div
                      className="product-card-price"
                      style={{ fontSize: 13, color: "#aaa" }}
                    >
                      Price quoted by admin
                    </div>
                  </div>
                  <div className="product-card-actions">
                    <button className="btn-view" onClick={() => setSelected(p)}>
                      👁 View
                    </button>
                    <button
                      className="btn-add-cart"
                      style={{
                        background: "linear-gradient(135deg,#2d6a4f,#52b788)",
                      }}
                      onClick={() => setSelected(p)}
                    >
                      <Scissors size={13} /> Customize
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <CustomizeModal
          product={selected}
          onClose={() => setSelected(null)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}
