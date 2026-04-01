/**
 * context/customcartcontext.jsx
 * Separate cart for customization orders
 */
import { createContext, useContext, useState, useEffect } from "react";

const CustomCartContext = createContext();

export function CustomCartProvider({ children }) {
  const [customCart, setCustomCart] = useState(() => {
    try {
      const saved = sessionStorage.getItem("cust_custom_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    sessionStorage.setItem("cust_custom_cart", JSON.stringify(customCart));
  }, [customCart]);

  const addToCustomCart = (item) => {
    setCustomCart((prev) => {
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
  };

  const removeFromCustomCart = (key) =>
    setCustomCart((prev) => prev.filter((i) => i.key !== key));

  const clearCustomCart = () => {
    setCustomCart([]);
    sessionStorage.removeItem("cust_custom_cart");
  };

  const customCartCount = customCart.length; // each entry = 1 custom item

  return (
    <CustomCartContext.Provider
      value={{
        customCart,
        customCartCount,
        addToCustomCart,
        removeFromCustomCart,
        clearCustomCart,
      }}
    >
      {children}
    </CustomCartContext.Provider>
  );
}

export const useCustomCart = () => useContext(CustomCartContext);
