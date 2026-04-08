const express = require("express");
const router = express.Router();
const cartController = require("../controllers/customer/customer.cart");
const { authenticate } = require("../middleware/auth");

// All cart routes require the user to be logged in
router.use(authenticate);

router.get("/", cartController.getCart);
router.post("/add", cartController.addToCart);
router.put("/update", cartController.updateQuantity);
router.delete("/clear", cartController.clearCart);
router.delete("/remove/:key", cartController.removeItem);

module.exports = router;
