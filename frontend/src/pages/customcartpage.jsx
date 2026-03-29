/**
 * pages/customcartpage.jsx
 * Shows custom/customization cart items
 */
import { useNavigate } from "react-router-dom";
import { Scissors, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCustomCart } from "../context/customcartcontext";
import "./customizepage.css";

const API = "http://localhost:5000";

export default function CustomCartPage() {
  const navigate = useNavigate();
  const { customCart, removeFromCustomCart, clearCustomCart } = useCustomCart();

  const itemCount = customCart.length;

  return (
    <div>
      <div className="page-hero">
        <h1>
          <Scissors
            size={24}
            style={{
              display: "inline",
              marginRight: 10,
              verticalAlign: "middle",
            }}
          />
          Custom Order Cart
        </h1>
        <p>Review your customized items before submitting</p>
      </div>

      {customCart.length === 0 ? (
        <div className="cart-items-panel">
          <div className="cart-empty">
            <div className="cart-empty-icon">✂️</div>
            <h3>No custom items yet</h3>
            <p>
              Go to the Customize page to add items with your specifications.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/customize")}
            >
              <ShoppingBag size={16} /> Browse Custom Products
            </button>
          </div>
        </div>
      ) : (
        <div className="cart-layout">
          {/* Left: items */}
          <div className="cart-items-panel">
            <div className="cart-panel-header">
              <h2>
                <Scissors
                  size={16}
                  style={{
                    display: "inline",
                    marginRight: 8,
                    verticalAlign: "middle",
                  }}
                />
                Custom Items
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span>
                  {itemCount} item{itemCount !== 1 ? "s" : ""}
                </span>
                <button className="cart-clear-btn" onClick={clearCustomCart}>
                  Clear all
                </button>
              </div>
            </div>

            {customCart.map((item) => (
              <div key={item.key} className="custom-cart-item">
                {/* Image */}
                <div className="cart-item-img" style={{ flexShrink: 0 }}>
                  {item.image_url ? (
                    <img
                      src={`${API}/${item.image_url}`}
                      alt={item.product_name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: 8,
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <span
                    style={{
                      display: item.image_url ? "none" : "flex",
                      fontSize: 22,
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    🪵
                  </span>
                </div>

                {/* Info */}
                <div className="custom-cart-item-info">
                  <div className="cart-item-name">{item.product_name}</div>
                  <div className="custom-cart-specs">
                    {item.wood_type && (
                      <span className="custom-spec-tag">
                        🪵 {item.wood_type}
                      </span>
                    )}
                    {item.color && (
                      <span className="custom-spec-tag">🎨 {item.color}</span>
                    )}
                    {item.door_style && (
                      <span className="custom-spec-tag">
                        🚪 {item.door_style}
                      </span>
                    )}
                    {item.hardware && (
                      <span className="custom-spec-tag">
                        🔩 {item.hardware}
                      </span>
                    )}
                    {(item.width || item.height || item.depth) && (
                      <span className="custom-spec-tag">
                        📐{" "}
                        {[
                          item.width && `W${item.width}`,
                          item.height && `H${item.height}`,
                          item.depth && `D${item.depth}`,
                        ]
                          .filter(Boolean)
                          .join(" × ")}{" "}
                        cm
                      </span>
                    )}
                    {item.quantity > 1 && (
                      <span className="custom-spec-tag">×{item.quantity}</span>
                    )}
                  </div>
                  {item.comments && (
                    <div className="custom-cart-comment">
                      💬 {item.comments}
                    </div>
                  )}
                </div>

                {/* Price TBD */}
                <div
                  className="cart-item-subtotal"
                  style={{ fontSize: 12, color: "#aaa", minWidth: 70 }}
                >
                  Price TBD
                </div>

                {/* Remove */}
                <button
                  className="cart-item-remove"
                  onClick={() => removeFromCustomCart(item.key)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Right: summary */}
          <div className="order-summary-panel">
            <div className="summary-header">
              <h2>Order Summary</h2>
            </div>
            <div className="summary-body">
              <div className="summary-row">
                <span>
                  {itemCount} custom item{itemCount !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="summary-row">
                <span>Total Price</span>
                <span style={{ color: "#D2691E", fontWeight: 700 }}>
                  Quoted by Admin
                </span>
              </div>
              <hr className="summary-divider" />
              <p className="summary-note">
                Pricing will be determined by our team after reviewing your
                specifications. You'll be contacted to confirm before production
                begins.
              </p>
              <button
                className="checkout-btn"
                onClick={() => navigate("/custom-checkout")}
              >
                Submit Custom Order <ArrowRight size={16} />
              </button>
              <button
                className="continue-shopping"
                onClick={() => navigate("/customize")}
              >
                ← Add More Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
