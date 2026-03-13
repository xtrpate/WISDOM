/**
 * pages/ProductCatalog.jsx
 * Updated: real product images with placeholder fallback
 */
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Search, ShoppingCart, Eye, Plus, Minus } from "lucide-react";
import "./productcatalog.css";
import BlueprintGallery from "./blueprintgallery";

const API = "http://localhost:5000";

/* ── Image component with fallback ── */
const ProductImage = ({ src, alt, className, style }) => {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className={className} style={style}>
        <div className="product-img-placeholder-icon">🪵</div>
        <div className="product-img-alt">{alt}</div>
      </div>
    );
  }
  return (
    <img
      src={`${API}/${src}`}
      alt={alt}
      className={className}
      style={{ width: "100%", height: "100%", objectFit: "cover", ...style }}
      onError={() => setErrored(true)}
    />
  );
};

/* ── Skeleton loader card ── */
const SkeletonCard = () => (
  <div className="product-skeleton">
    <div className="skeleton-img" />
    <div className="skeleton-body">
      <div className="skeleton-line short" />
      <div className="skeleton-line medium" />
      <div className="skeleton-line" />
    </div>
  </div>
);

/* ── Stock badge ── */
const StockBadge = ({ status }) => {
  const map = {
    in_stock: { cls: "badge-green", label: "In Stock" },
    low_stock: { cls: "badge-yellow", label: "Low Stock" },
    out_of_stock: { cls: "badge-red", label: "Out of Stock" },
  };
  const { cls, label } = map[status] || { cls: "badge-gray", label: status };
  return <span className={`badge ${cls} product-card-stock`}>{label}</span>;
};

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("cust_cart") || "[]");
    } catch {
      return [];
    }
  });

  /* Filters */
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");

  /* Modal state */
  const [selVariation, setSelVariation] = useState(null);
  const [qty, setQty] = useState(1);
  const [cartMsg, setCartMsg] = useState("");

  /* ── Fetch products ── */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (catFilter !== "all") params.set("category_id", catFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (stockFilter !== "all") params.set("stock_status", stockFilter);
      if (priceMin) params.set("price_min", priceMin);
      if (priceMax) params.set("price_max", priceMax);
      params.set("sort", sortBy);

      const res = await axios.get(`/api/customer/products?${params}`);
      setProducts(res.data.products || []);
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [search, catFilter, typeFilter, stockFilter, priceMin, priceMax, sortBy]);

  useEffect(() => {
    const t = setTimeout(fetchProducts, 350);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  /* Persist cart */
  useEffect(() => {
    sessionStorage.setItem("cust_cart", JSON.stringify(cart));
  }, [cart]);

  /* Open modal */
  const openProduct = (product) => {
    setSelected(product);
    setSelVariation(null);
    setQty(1);
    setCartMsg("");
  };

  /* Add to cart */
  const addToCart = () => {
    if (!selected) return;
    const hasVariations = selected.variations?.length > 0;
    if (hasVariations && !selVariation) {
      setCartMsg("Please select a variation first.");
      return;
    }
    const key = selVariation
      ? `${selected.id}-${selVariation.id}`
      : `${selected.id}`;
    const price = selVariation?.selling_price ?? selected.online_price;
    const stock = selVariation?.stock ?? selected.stock;
    const name = selVariation
      ? `${selected.name} (${selVariation.variation_name})`
      : selected.name;

    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key
            ? { ...i, quantity: Math.min(i.quantity + qty, stock) }
            : i,
        );
      }
      return [
        ...prev,
        {
          key,
          product_id: selected.id,
          variation_id: selVariation?.id || null,
          product_name: name,
          unit_price: parseFloat(price),
          production_cost:
            selVariation?.unit_cost ?? selected.production_cost ?? 0,
          quantity: qty,
          max_stock: stock,
          image_url: selected.image_url || null,
        },
      ];
    });

    setCartMsg(`✓ Added ${qty} × "${name}" to cart!`);
    setTimeout(() => setCartMsg(""), 3000);
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const clearFilters = () => {
    setSearch("");
    setCatFilter("all");
    setTypeFilter("all");
    setStockFilter("all");
    setPriceMin("");
    setPriceMax("");
    setSortBy("name_asc");
  };

  const hasActiveFilters =
    search ||
    catFilter !== "all" ||
    typeFilter !== "all" ||
    stockFilter !== "all" ||
    priceMin ||
    priceMax;

  return (
    <div>
      {/* Page hero */}
      <div
        className="page-hero"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1>Product Catalog</h1>
          <p>
            Browse our collection of premium wood furniture and cabinet products
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => (window.location.href = "/cart")}
          style={{ position: "relative" }}
        >
          <ShoppingCart size={16} /> Cart
          {cartCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -8,
                right: -8,
                background: "#c62828",
                color: "white",
                borderRadius: "50%",
                width: 20,
                height: 20,
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>

      <div className="catalog-layout">
        {/* ── Sidebar ── */}
        <aside className="catalog-sidebar">
          <div className="sidebar-title">Filters</div>

          <div className="filter-section">
            <span className="filter-label">Category</span>
            <div className="filter-options">
              <button
                className={`filter-option ${catFilter === "all" ? "active" : ""}`}
                onClick={() => setCatFilter("all")}
              >
                All Categories{" "}
                <span className="filter-count">{products.length}</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`filter-option ${catFilter === String(cat.id) ? "active" : ""}`}
                  onClick={() => setCatFilter(String(cat.id))}
                >
                  {cat.name}
                  <span className="filter-count">
                    {products.filter((p) => p.category_id === cat.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <span className="filter-label">Product Type</span>
            <div className="filter-options">
              {[
                { val: "all", label: "All Types" },
                { val: "standard", label: "Ready-Made" },
                { val: "blueprint", label: "Blueprint / Custom" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  className={`filter-option ${typeFilter === opt.val ? "active" : ""}`}
                  onClick={() => setTypeFilter(opt.val)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <span className="filter-label">Availability</span>
            <div className="filter-options">
              {[
                { val: "all", label: "All" },
                { val: "in_stock", label: "In Stock" },
                { val: "low_stock", label: "Low Stock" },
                { val: "out_of_stock", label: "Out of Stock" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  className={`filter-option ${stockFilter === opt.val ? "active" : ""}`}
                  onClick={() => setStockFilter(opt.val)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <span className="filter-label">Price Range (₱)</span>
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Min"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
              <span>—</span>
              <input
                type="number"
                placeholder="Max"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button className="clear-filters" onClick={clearFilters}>
              ✕ Clear All Filters
            </button>
          )}
        </aside>

        {/* ── Main ── */}
        <div className="catalog-main">
          <div className="catalog-toolbar">
            <div className="catalog-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="catalog-sort">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name_asc">Name A–Z</option>
                <option value="name_desc">Name Z–A</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>

          {!loading && (
            <div className="catalog-results-info">
              Showing <strong>{products.length}</strong> product
              {products.length !== 1 ? "s" : ""}
              {hasActiveFilters && " (filtered)"}
            </div>
          )}

          <div className="product-grid">
            {typeFilter === "blueprint" ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <BlueprintGallery embedded />
              </div>
            ) : loading ? (
              Array(8)
                .fill(0)
                .map((_, i) => <SkeletonCard key={i} />)
            ) : products.length === 0 ? (
              <div className="catalog-empty">
                <div className="catalog-empty-icon">🪵</div>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search term.</p>
              </div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="product-card">
                  {/* ── Product image ── */}
                  <div
                    className="product-img-box"
                    onClick={() => openProduct(product)}
                  >
                    <div className="product-card-badges">
                      {product.is_featured && (
                        <span className="badge badge-brown">Featured</span>
                      )}
                      {product.type === "blueprint" && (
                        <span className="badge badge-blue">Custom</span>
                      )}
                    </div>
                    {product.image_url ? (
                      <img
                        src={`${API}/${product.image_url}`}
                        alt={product.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    {/* Fallback shown when no image or image fails */}
                    <div
                      className="product-img-fallback"
                      style={{
                        display: product.image_url ? "none" : "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        width: "100%",
                        height: "100%",
                        position: "absolute",
                        inset: 0,
                      }}
                    >
                      <div className="product-img-placeholder-icon">🪵</div>
                      <div className="product-img-alt">{product.name}</div>
                    </div>
                  </div>

                  <div className="product-card-body">
                    <div className="product-card-category">
                      {product.category || "Uncategorized"}
                    </div>
                    <div className="product-card-name">{product.name}</div>
                    <div className="product-card-desc">
                      {product.description || "Premium quality wood product."}
                    </div>
                    <div className="product-card-footer">
                      <div className="product-card-price">
                        ₱
                        {parseFloat(product.online_price).toLocaleString(
                          "en-PH",
                          { minimumFractionDigits: 2 },
                        )}
                      </div>
                      <StockBadge status={product.stock_status} />
                    </div>
                  </div>

                  <div className="product-card-actions">
                    <button
                      className="btn-add-cart"
                      disabled={product.stock_status === "out_of_stock"}
                      onClick={() => openProduct(product)}
                    >
                      <ShoppingCart size={14} />
                      {product.stock_status === "out_of_stock"
                        ? "Out of Stock"
                        : "Add to Cart"}
                    </button>
                    <button
                      className="btn-view"
                      onClick={() => openProduct(product)}
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Product Detail Modal ── */}
      {selected && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="modal-box">
            {/* Modal image */}
            <div className="modal-img-box">
              <button className="modal-close" onClick={() => setSelected(null)}>
                ×
              </button>
              {selected.image_url ? (
                <img
                  src={`${API}/${selected.image_url}`}
                  alt={selected.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "16px 16px 0 0",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                style={{
                  display: selected.image_url ? "none" : "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  width: "100%",
                  height: "100%",
                }}
              >
                <div className="modal-img-icon">🪵</div>
                <div className="modal-img-label">{selected.name}</div>
              </div>
            </div>

            <div className="modal-body">
              <div className="modal-category">
                {selected.category || "Uncategorized"}
              </div>
              <div className="modal-name">{selected.name}</div>
              <div className="modal-price">
                ₱
                {parseFloat(
                  selVariation?.selling_price ?? selected.online_price,
                ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </div>

              {selected.description && (
                <p className="modal-desc">{selected.description}</p>
              )}

              <div className="modal-meta">
                <div className="modal-meta-item">
                  <label>Type</label>
                  <span style={{ textTransform: "capitalize" }}>
                    {selected.type}
                  </span>
                </div>
                <div className="modal-meta-item">
                  <label>Availability</label>
                  <StockBadge status={selected.stock_status} />
                </div>
                <div className="modal-meta-item">
                  <label>Stock</label>
                  <span>{selected.stock} units</span>
                </div>
                <div className="modal-meta-item">
                  <label>Category</label>
                  <span>{selected.category || "—"}</span>
                </div>
              </div>

              {selected.variations?.length > 0 && (
                <div className="modal-variations">
                  <h4>Select Variation</h4>
                  <div className="variation-grid">
                    {selected.variations.map((v) => (
                      <button
                        key={v.id}
                        className={`var-chip ${selVariation?.id === v.id ? "selected" : ""}`}
                        onClick={() => setSelVariation(v)}
                        disabled={v.stock <= 0}
                      >
                        {v.variation_name}
                        {v.stock <= 0 && " (Out)"}
                        {v.stock > 0 &&
                          ` — ₱${parseFloat(v.selling_price).toLocaleString("en-PH")}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-qty">
                <label>Quantity</label>
                <div className="qty-controls">
                  <button
                    className="qty-btn"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="qty-val">{qty}</span>
                  <button
                    className="qty-btn"
                    onClick={() => {
                      const maxStock = selVariation?.stock ?? selected.stock;
                      setQty((q) => Math.min(q + 1, maxStock));
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {cartMsg && (
                <div
                  style={{
                    background: cartMsg.startsWith("✓") ? "#e8f5e9" : "#fce4ec",
                    color: cartMsg.startsWith("✓") ? "#2e7d32" : "#c62828",
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 16,
                  }}
                >
                  {cartMsg}
                </div>
              )}

              <div className="modal-actions">
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: "center" }}
                  disabled={selected.stock_status === "out_of_stock"}
                  onClick={addToCart}
                >
                  <ShoppingCart size={16} /> Add to Cart
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelected(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
