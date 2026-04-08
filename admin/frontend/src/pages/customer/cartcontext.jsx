/**
 * context/CartContext.jsx
 * Global cart state backed by MySQL Database
 */
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import useAuthStore from "../../store/authStore";

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useAuthStore();
  const [cart, setCart] = useState([]);

  /* ── 1. Fetch Cart from Database when User logs in ── */
  const fetchCart = async () => {
    if (!user) {
      setCart([]); // Clear cart instantly if logged out
      return;
    }
    try {
      const res = await axios.get("/api/customer/cart");
      setCart(res.data);
    } catch (err) {
      console.error("Failed to load cart from database:", err);
    }
  };

  // Run fetchCart whenever the user logs in or out
  useEffect(() => {
    fetchCart();
  }, [user]);

  /* ── 2. Add to Cart (Optimistic UI + Database) ── */
  const addToCart = async (item) => {
    if (!user) {
      alert("Please sign in to add items to your cart!");
      return;
    }

    // Optimistic Update: Update UI instantly so it feels fast
    setCart((prev) => {
      const existing = prev.find((i) => i.key === item.key);
      if (existing) {
        return prev.map((i) =>
          i.key === item.key
            ? { ...i, quantity: i.quantity + item.quantity }
            : i,
        );
      }
      return [...prev, item];
    });

    // Background Database Save
    try {
      await axios.post("/api/customer/cart/add", item);
    } catch (err) {
      console.error("Failed to save item to database", err);
      fetchCart(); // If DB fails, revert to the real database state
    }
  };

  /* ── 3. Update Quantity (Optimistic UI + Database) ── */
  const updateQty = async (key, delta) => {
    if (!user) return;

    // Optimistic Update
    setCart((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const newQty = item.quantity + delta;
        // Prevent going below 1 (The trash can icon handles actual removal)
        if (newQty < 1) return item;
        return { ...item, quantity: newQty };
      }),
    );

    // Background Database Save
    try {
      await axios.put("/api/customer/cart/update", { key, change: delta });
    } catch (err) {
      console.error("Failed to update quantity", err);
      fetchCart();
    }
  };

  /* ── 4. Remove Item (Optimistic UI + Database) ── */
  const removeItem = async (key) => {
    if (!user) return;

    // Optimistic Update
    setCart((prev) => prev.filter((i) => i.key !== key));

    // Background Database Delete
    try {
      await axios.delete(`/api/customer/cart/remove/${key}`);
    } catch (err) {
      console.error("Failed to remove item", err);
      fetchCart();
    }
  };

  /* ── 5. Clear Entire Cart ── */
  const clearCart = async () => {
    if (!user) return;

    setCart([]); // Optimistic Update

    try {
      await axios.delete("/api/customer/cart/clear");
    } catch (err) {
      console.error("Failed to clear cart", err);
      fetchCart();
    }
  };

  /* ── Computed Totals ── */
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        addToCart,
        updateQty,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
