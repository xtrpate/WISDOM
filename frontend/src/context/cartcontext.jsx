/**
 * context/CartContext.jsx
 * Global cart state shared across all pages
 */
import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = sessionStorage.getItem("cust_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  /* Sync to sessionStorage whenever cart changes */
  useEffect(() => {
    sessionStorage.setItem("cust_cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.key === item.key);
      if (existing) {
        return prev.map((i) =>
          i.key === item.key
            ? {
                ...i,
                quantity: Math.min(i.quantity + item.quantity, i.max_stock),
              }
            : i,
        );
      }
      return [...prev, item];
    });
  };

  const updateQty = (key, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.key !== key) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.max_stock) return item;
          return { ...item, quantity: newQty };
        })
        .filter(Boolean),
    );
  };

  const removeItem = (key) =>
    setCart((prev) => prev.filter((i) => i.key !== key));

  const clearCart = () => {
    setCart([]);
    sessionStorage.removeItem("cust_cart");
  };

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
