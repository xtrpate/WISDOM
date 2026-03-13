/**
 * pages/cartpage.jsx
 * Uses CartContext — cart state is shared across all pages
 */
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import { useCart } from "../context/cartcontext";
import "./cart.css";

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, cartCount, cartTotal, updateQty, removeItem, clearCart } =
    useCart();

  return (
    <div>
      <div className="page-hero">
        <h1>Shopping Cart</h1>
        <p>Review your items before proceeding to checkout</p>
      </div>

      {cart.length === 0 ? (
        <div className="cart-items-panel">
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <h3>Your cart is empty</h3>
            <p>Browse our catalog and add products to your cart.</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/catalog")}
            >
              <ShoppingBag size={16} /> Browse Products
            </button>
          </div>
        </div>
      ) : (
        <div className="cart-layout">
          {/* ── Left: items ── */}
          <div className="cart-items-panel">
            <div className="cart-panel-header">
              <h2>
                <ShoppingCart
                  size={18}
                  style={{
                    display: "inline",
                    marginRight: 8,
                    verticalAlign: "middle",
                  }}
                />
                Cart Items
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span>
                  {cartCount} item{cartCount !== 1 ? "s" : ""}
                </span>
                <button className="cart-clear-btn" onClick={clearCart}>
                  Clear all
                </button>
              </div>
            </div>

            {cart.map((item) => (
              <div key={item.key} className="cart-item-row">
                {/* Image */}
                <div className="cart-item-img">
                  {item.image_url ? (
                    <img
                      src={`http://localhost:5000/${item.image_url}`}
                      alt={item.product_name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: 8,
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "block";
                      }}
                    />
                  ) : null}
                  <span style={{ display: item.image_url ? "none" : "block" }}>
                    🪵
                  </span>
                </div>

                <div className="cart-item-info">
                  <div className="cart-item-name">{item.product_name}</div>
                  <div className="cart-item-unit-price">
                    ₱
                    {parseFloat(item.unit_price).toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    each
                  </div>
                </div>

                {/* Qty controls */}
                <div className="cart-item-controls">
                  <button
                    className="cart-qty-btn"
                    onClick={() => updateQty(item.key, -1)}
                  >
                    <Minus size={13} />
                  </button>
                  <span className="cart-qty-val">{item.quantity}</span>
                  <button
                    className="cart-qty-btn"
                    onClick={() => updateQty(item.key, 1)}
                  >
                    <Plus size={13} />
                  </button>
                </div>

                {/* Subtotal */}
                <div className="cart-item-subtotal">
                  ₱
                  {(item.unit_price * item.quantity).toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </div>

                {/* Remove */}
                <button
                  className="cart-item-remove"
                  onClick={() => removeItem(item.key)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* ── Right: summary ── */}
          <div className="order-summary-panel">
            <div className="summary-header">
              <h2>Order Summary</h2>
            </div>
            <div className="summary-body">
              <div className="summary-row">
                <span>Subtotal ({cartCount} items)</span>
                <span>
                  ₱
                  {cartTotal.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span style={{ color: "#2e7d32", fontWeight: 700 }}>
                  Calculated at checkout
                </span>
              </div>

              <hr className="summary-divider" />

              <div className="summary-total">
                <span>Total</span>
                <span>
                  ₱
                  {cartTotal.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              <p className="summary-note">
                Final total including any delivery fees will be confirmed at
                checkout.
              </p>

              <button
                className="checkout-btn"
                onClick={() => navigate("/checkout")}
              >
                Proceed to Checkout <ArrowRight size={16} />
              </button>
              <button
                className="continue-shopping"
                onClick={() => navigate("/catalog")}
              >
                ← Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
