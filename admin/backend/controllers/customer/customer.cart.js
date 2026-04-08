const db = require("../../config/db");

// Get the user's cart
exports.getCart = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT item_key as `key`, product_id, product_name, image_url, unit_price, quantity, wood_type, item_type FROM cart_items WHERE customer_id = ?",
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("[getCart]", err);
    res.status(500).json({ message: "Failed to fetch cart." });
  }
};

// Add or update an item in the cart
exports.addToCart = async (req, res) => {
  const {
    key,
    product_id,
    product_name,
    image_url,
    unit_price,
    quantity,
    wood_type,
    item_type,
  } = req.body;

  try {
    // If the exact item (key) already exists for this user, it updates the quantity. Otherwise, it inserts it.
    await db.execute(
      `INSERT INTO cart_items 
        (customer_id, item_key, product_id, product_name, image_url, unit_price, quantity, wood_type, item_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
      [
        req.user.id,
        key,
        product_id || null,
        product_name,
        image_url || null,
        unit_price || 0,
        quantity || 1,
        wood_type || null,
        item_type || "ready_made",
        quantity || 1,
      ],
    );
    res.json({ message: "Item added to cart." });
  } catch (err) {
    console.error("[addToCart]", err);
    res.status(500).json({ message: "Failed to add item." });
  }
};

// Update quantity directly (+1 or -1)
exports.updateQuantity = async (req, res) => {
  const { key, change } = req.body;
  try {
    // Prevent quantity from dropping below 1 in the database
    await db.execute(
      "UPDATE cart_items SET quantity = GREATEST(1, quantity + ?) WHERE customer_id = ? AND item_key = ?",
      [change, req.user.id, key],
    );
    res.json({ message: "Quantity updated." });
  } catch (err) {
    console.error("[updateQuantity]", err);
    res.status(500).json({ message: "Failed to update quantity." });
  }
};

// Remove a single item
exports.removeItem = async (req, res) => {
  const { key } = req.params;
  try {
    await db.execute(
      "DELETE FROM cart_items WHERE customer_id = ? AND item_key = ?",
      [req.user.id, key],
    );
    res.json({ message: "Item removed." });
  } catch (err) {
    console.error("[removeItem]", err);
    res.status(500).json({ message: "Failed to remove item." });
  }
};

// Clear the entire cart
exports.clearCart = async (req, res) => {
  try {
    await db.execute("DELETE FROM cart_items WHERE customer_id = ?", [
      req.user.id,
    ]);
    res.json({ message: "Cart cleared." });
  } catch (err) {
    console.error("[clearCart]", err);
    res.status(500).json({ message: "Failed to clear cart." });
  }
};
