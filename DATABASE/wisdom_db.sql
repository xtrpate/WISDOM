-- =============================================================================
-- WISDOM: Web-Based Sales and Inventory System with Digital Blueprint
-- ======================================
CREATE DATABASE IF NOT EXISTS wisdom_db;
USE wisdom_db;

-- ============================================================
-- 1. USERS & AUTH
-- ============================================================

CREATE TABLE users (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(100)  NOT NULL,
  email             VARCHAR(150)  UNIQUE NOT NULL,
  password          VARCHAR(255)  NOT NULL,
  role              ENUM('admin','staff','customer') DEFAULT 'customer',
  phone             VARCHAR(20),
  address           TEXT,
  profile_photo     TEXT,
  -- Verification & Approval
  is_verified       BOOLEAN       DEFAULT FALSE,
  otp_code          VARCHAR(10),
  otp_expires       DATETIME,
  approval_status   ENUM('pending','approved','rejected') DEFAULT 'pending',
  approved_by       INT,
  approved_at       DATETIME,
  -- Account Status
  is_active         BOOLEAN       DEFAULT TRUE,
  last_login        DATETIME,
  created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Active session tracking (for role-based session management)
CREATE TABLE user_sessions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT           NOT NULL,
  token_hash    VARCHAR(255)  NOT NULL,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  expires_at    DATETIME      NOT NULL,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Secure password reset tokens
CREATE TABLE password_resets (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  DATETIME     NOT NULL,
  used        BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 2. SUPPLIERS
-- ============================================================

CREATE TABLE suppliers (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  address         TEXT,
  contact_number  VARCHAR(20),
  email           VARCHAR(150),
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. CATEGORIES
-- ============================================================

CREATE TABLE categories (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  type  ENUM('raw','build','blueprint') DEFAULT 'build'
);

-- ============================================================
-- 4. RAW MATERIALS
-- ============================================================

CREATE TABLE raw_materials (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(150)    NOT NULL,
  category_id     INT,
  unit            VARCHAR(30),
  quantity        DECIMAL(10,2)   DEFAULT 0,
  reorder_point   DECIMAL(10,2)   DEFAULT 0,
  unit_cost       DECIMAL(10,2)   DEFAULT 0,
  supplier_id     INT,
  -- Status derived at query time (in_stock / low_stock / out_of_stock)
  -- but stored here for quick dashboard reads
  stock_status    ENUM('in_stock','low_stock','out_of_stock') DEFAULT 'in_stock',
  created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id)  REFERENCES categories(id),
  FOREIGN KEY (supplier_id)  REFERENCES suppliers(id)
);

-- ============================================================
-- 5. PRODUCTS (Standard Prefab & Blueprint Products)
-- ============================================================

CREATE TABLE products (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  barcode         VARCHAR(100)  UNIQUE,
  name            VARCHAR(200)  NOT NULL,
  description     TEXT,
  category_id     INT,
  -- 'standard' = ready-made prefab | 'blueprint' = custom cabinet design
  type            ENUM('standard','blueprint') DEFAULT 'standard',
  image_url       TEXT,
  is_featured     BOOLEAN       DEFAULT FALSE,
  online_price    DECIMAL(10,2) DEFAULT 0,
  walkin_price    DECIMAL(10,2) DEFAULT 0,
  production_cost DECIMAL(10,2) DEFAULT 0,
  profit_margin   DECIMAL(10,2) GENERATED ALWAYS AS
                    (walkin_price - production_cost) STORED,
  stock           INT           DEFAULT 0,
  reorder_point   INT           DEFAULT 0,
  stock_status    ENUM('in_stock','low_stock','out_of_stock') DEFAULT 'in_stock',
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Product Variations: wood type (plywood/MDF/solid wood), design style, finish color
CREATE TABLE product_variations (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  product_id      INT           NOT NULL,
  variation_type  VARCHAR(50),                    -- e.g. 'wood_type', 'design', 'finish'
  variation_value VARCHAR(100),                   -- e.g. 'Plywood', 'MDF', 'Standard'
  variation_name  VARCHAR(100),                   -- display label
  unit_cost       DECIMAL(10,2),
  selling_price   DECIMAL(10,2),
  profit_margin   DECIMAL(10,2) GENERATED ALWAYS AS
                    (selling_price - unit_cost) STORED,
  stock           INT           DEFAULT 0,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Bill of Materials: which raw materials build a finished product
CREATE TABLE bill_of_materials (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  product_id      INT           NOT NULL,
  raw_material_id INT           NOT NULL,
  quantity        DECIMAL(10,2),
  FOREIGN KEY (product_id)      REFERENCES products(id)      ON DELETE CASCADE,
  FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
);

-- ============================================================
-- 6. BLUEPRINTS
-- ============================================================

CREATE TABLE blueprints (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(200)  NOT NULL,
  description     TEXT,
  creator_id      INT           NOT NULL,                     -- admin/staff who designed it
  client_id       INT,                                        -- linked customer (if any)
  -- Stage controls which fields are locked for editing
  stage           ENUM('design','estimation','approval','production',
                       'delivery','completed','archived') DEFAULT 'design',
  -- 2D design payload (components, positions, dimensions)
  design_data     JSON,
  -- 3D view state (camera angles, material renders)
  view_3d_data    JSON,
  -- JSON array of field names locked at current stage
  locked_fields   JSON,
  thumbnail_url   TEXT,
  -- 'created' = made from scratch | 'imported' = uploaded file
  source          ENUM('created','imported') DEFAULT 'created',
  file_url        TEXT,                                       -- for imported files (PDF/JPG/PNG)
  file_type       VARCHAR(10),                                -- pdf, jpg, png
  -- Gallery visibility for customer browsing
  is_template     BOOLEAN       DEFAULT FALSE,                -- admin-published template
  is_gallery      BOOLEAN       DEFAULT FALSE,                -- show in customer gallery
  is_deleted      BOOLEAN       DEFAULT FALSE,                -- soft-delete → goes to Archive
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id),
  FOREIGN KEY (client_id)  REFERENCES users(id)
);

-- Individual component specs stored per blueprint
CREATE TABLE blueprint_components (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  blueprint_id    INT           NOT NULL,
  component_type  VARCHAR(100),                               -- e.g. 'upper_cabinet', 'drawer', 'door'
  label           VARCHAR(150),
  width_mm        DECIMAL(8,2),
  height_mm       DECIMAL(8,2),
  depth_mm        DECIMAL(8,2),
  wood_type       VARCHAR(100),
  door_style      VARCHAR(100),
  hardware        VARCHAR(150),
  finish_color    VARCHAR(100),
  quantity        INT           DEFAULT 1,
  position_x      DECIMAL(8,2),
  position_y      DECIMAL(8,2),
  is_locked       BOOLEAN       DEFAULT FALSE,
  raw_material_id INT,                                        -- linked raw material if applicable
  FOREIGN KEY (blueprint_id)    REFERENCES blueprints(id) ON DELETE CASCADE,
  FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
);

-- Full revision history per blueprint
CREATE TABLE blueprint_revisions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  blueprint_id    INT           NOT NULL,
  revision_number INT           DEFAULT 1,
  stage_at_save   VARCHAR(50),
  revision_data   JSON,                                       -- snapshot of design_data
  revised_by      INT,
  notes           TEXT,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (blueprint_id) REFERENCES blueprints(id),
  FOREIGN KEY (revised_by)   REFERENCES users(id)
);

-- ============================================================
-- 7. ESTIMATIONS
-- ============================================================

CREATE TABLE estimations (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  blueprint_id      INT           NOT NULL,
  version           INT           DEFAULT 1,                  -- supports duplicated/revised estimates
  material_cost     DECIMAL(12,2) DEFAULT 0,
  labor_cost        DECIMAL(12,2) DEFAULT 0,
  -- Labor breakdown: { workers, days, rate_per_day, complexity_factor }
  labor_breakdown   JSON,
  tax               DECIMAL(10,2) DEFAULT 0,
  discount          DECIMAL(10,2) DEFAULT 0,
  grand_total       DECIMAL(12,2) DEFAULT 0,
  -- Full line-item payload for PDF export
  estimation_data   JSON,
  status            ENUM('draft','sent','approved','rejected') DEFAULT 'draft',
  pdf_url           TEXT,                                      -- exported quotation PDF
  approved_by       INT,
  approved_at       DATETIME,
  created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (blueprint_id) REFERENCES blueprints(id),
  FOREIGN KEY (approved_by)  REFERENCES users(id)
);

-- Line items for each estimation (per component/material)
CREATE TABLE estimation_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  estimation_id   INT           NOT NULL,
  component_id    INT,                                        -- optional link to blueprint_components
  raw_material_id INT,
  description     VARCHAR(255),
  quantity        DECIMAL(10,2),
  unit_cost       DECIMAL(10,2),
  subtotal        DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  FOREIGN KEY (estimation_id)   REFERENCES estimations(id) ON DELETE CASCADE,
  FOREIGN KEY (component_id)    REFERENCES blueprint_components(id),
  FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
);

-- ============================================================
-- 8. CONTRACTS
-- ============================================================

CREATE TABLE contracts (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  blueprint_id        INT,
  order_id            INT,
  customer_id         INT,
  customer_name       VARCHAR(200),
  start_date          DATE,
  end_date            DATE,
  materials_used      TEXT,
  warranty_terms      TEXT,
  -- Payment terms stored on contract
  down_payment        DECIMAL(12,2) DEFAULT 0,
  processing_fee_pct  DECIMAL(5,2)  DEFAULT 15.00,            -- % fee if cancelled after down payment
  is_non_refundable   BOOLEAN       DEFAULT FALSE,            -- TRUE once contract is released
  authorized_by       INT,
  pdf_url             TEXT,
  signed_at           DATETIME,                               -- when customer e-signs / contract released
  created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id)  REFERENCES users(id),
  FOREIGN KEY (authorized_by) REFERENCES users(id)
);

-- ============================================================
-- 9. ORDERS
-- ============================================================

CREATE TABLE orders (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  order_number            VARCHAR(50)   UNIQUE,
  customer_id             INT,                                -- NULL for anonymous walk-in
  -- Walk-in customer info (if not registered)
  walkin_customer_name    VARCHAR(150),
  walkin_customer_phone   VARCHAR(20),
  -- Channel and product type
  type                    ENUM('online','walkin') DEFAULT 'online',
  order_type              ENUM('standard','blueprint') DEFAULT 'standard',
  status                  ENUM('pending','confirmed','production','shipping',
                               'delivered','completed','cancelled') DEFAULT 'pending',
  -- Payment
  payment_method          ENUM('cash','gcash','bank_transfer','cod','cop') DEFAULT 'cash',
  payment_status          ENUM('unpaid','partial','paid') DEFAULT 'unpaid',
  subtotal                DECIMAL(12,2) DEFAULT 0,
  tax                     DECIMAL(10,2) DEFAULT 0,
  discount                DECIMAL(10,2) DEFAULT 0,
  total                   DECIMAL(12,2) DEFAULT 0,
  down_payment            DECIMAL(12,2) DEFAULT 0,
  payment_proof           TEXT,
  -- Delivery & Notes
  delivery_address        TEXT,
  notes                   TEXT,
  -- Linked blueprint (for blueprint orders)
  blueprint_id            INT,
  -- Cancellation
  cancellation_reason     TEXT,
  cancelled_at            DATETIME,
  refund_amount           DECIMAL(12,2) DEFAULT 0,
  refund_status           ENUM('none','pending','processed') DEFAULT 'none',
  created_at              TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id)  REFERENCES users(id),
  FOREIGN KEY (blueprint_id) REFERENCES blueprints(id)
);

-- Order line items
CREATE TABLE order_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  order_id        INT           NOT NULL,
  product_id      INT,
  variation_id    INT,
  product_name    VARCHAR(200),                               -- snapshot of name at time of sale
  quantity        INT           DEFAULT 1,
  unit_price      DECIMAL(10,2),
  production_cost DECIMAL(10,2),
  profit_margin   DECIMAL(10,2) GENERATED ALWAYS AS
                    (unit_price - production_cost) STORED,
  subtotal        DECIMAL(10,2) GENERATED ALWAYS AS
                    (quantity * unit_price) STORED,
  FOREIGN KEY (order_id)     REFERENCES orders(id)             ON DELETE CASCADE,
  FOREIGN KEY (product_id)   REFERENCES products(id),
  FOREIGN KEY (variation_id) REFERENCES product_variations(id)
);

-- ============================================================
-- 10. PAYMENTS
-- ============================================================

-- Tracks every payment event per order (down payment, balance, etc.)
CREATE TABLE payment_transactions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  order_id        INT           NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  payment_method  ENUM('cash','gcash','bank_transfer','cod','cop'),
  proof_url       TEXT,                                       -- uploaded receipt image
  verified_by     INT,                                        -- admin who confirmed
  verified_at     DATETIME,
  status          ENUM('pending','verified','rejected') DEFAULT 'pending',
  notes           TEXT,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)    REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- Official Receipts (POS and online)
CREATE TABLE receipts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  order_id        INT           NOT NULL UNIQUE,
  receipt_number  VARCHAR(50)   UNIQUE,
  issued_to       VARCHAR(200),                               -- customer name on receipt
  issued_by       INT,                                        -- staff/admin who processed
  total_amount    DECIMAL(12,2),
  items_snapshot  JSON,                                       -- frozen line items for printing
  signature_url   TEXT,                                       -- owner e-signature image
  printed_at      DATETIME,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)  REFERENCES orders(id),
  FOREIGN KEY (issued_by) REFERENCES users(id)
);

-- ============================================================
-- 11. CANCELLATIONS
-- ============================================================

-- Enforces the cancellation policy rules from the scope
CREATE TABLE cancellations (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  order_id        INT           NOT NULL UNIQUE,
  requested_by    INT,                                        -- customer or staff
  reason          TEXT,
  policy_applied  ENUM('full_refund','processing_fee','non_refundable','voided'),
  refund_amount   DECIMAL(12,2) DEFAULT 0,
  processing_fee  DECIMAL(12,2) DEFAULT 0,
  approved_by     INT,
  approved_at     DATETIME,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)    REFERENCES orders(id),
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (approved_by)  REFERENCES users(id)
);

-- ============================================================
-- 12. DELIVERIES & APPOINTMENTS
-- ============================================================

CREATE TABLE deliveries (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  order_id        INT           NOT NULL,
  driver_id       INT,                                        -- auto-assigned available driver
  scheduled_date  DATETIME,
  delivered_date  DATETIME,
  address         TEXT,
  status          ENUM('scheduled','in_transit','delivered','failed') DEFAULT 'scheduled',
  signed_receipt  TEXT,                                       -- uploaded signed delivery proof
  notes           TEXT,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)  REFERENCES orders(id),
  FOREIGN KEY (driver_id) REFERENCES users(id)
);

CREATE TABLE appointments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  order_id        INT,
  assigned_to     INT,                                        -- cabinet maker / installer
  purpose         VARCHAR(200),                               -- e.g. 'site_measurement', 'installation'
  scheduled_date  DATETIME,
  preferred_date  DATETIME,                                   -- customer's preferred schedule
  status          ENUM('pending','confirmed','done','cancelled') DEFAULT 'pending',
  notes           TEXT,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)     REFERENCES orders(id),
  FOREIGN KEY (assigned_to)  REFERENCES users(id)
);

-- ============================================================
-- 13. STOCK MOVEMENTS
-- ============================================================

CREATE TABLE stock_movements (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  -- Either a raw material or finished product movement
  material_id     INT,
  product_id      INT,
  type            ENUM('in','out','adjustment','return') DEFAULT 'in',
  quantity        DECIMAL(10,2),
  -- Traceability: link to the source of the movement
  supplier_id     INT,                                        -- if type='in' from supplier
  order_id        INT,                                        -- if type='out' from sale
  order_item_id   INT,                                        -- specific item deducted
  reference       VARCHAR(100),                               -- e.g. PO number, invoice #
  notes           TEXT,
  created_by      INT,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id)   REFERENCES suppliers(id),
  FOREIGN KEY (order_id)      REFERENCES orders(id),
  FOREIGN KEY (order_item_id) REFERENCES order_items(id),
  FOREIGN KEY (created_by)    REFERENCES users(id)
);

-- ============================================================
-- 14. WARRANTY
-- ============================================================

CREATE TABLE warranties (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  order_id            INT,
  order_item_id       INT,                                    -- specific item under warranty
  customer_id         INT           NOT NULL,
  product_name        VARCHAR(200),
  reason              TEXT,
  proof_url           TEXT,                                   -- photo/doc uploaded by customer
  warranty_expiry     DATE,                                   -- 1 year from order completion
  status              ENUM('pending','approved','rejected','fulfilled') DEFAULT 'pending',
  replacement_receipt TEXT,                                   -- admin uploads proof of replacement
  fulfilled_at        DATETIME,
  fulfilled_by        INT,
  created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)      REFERENCES orders(id),
  FOREIGN KEY (order_item_id) REFERENCES order_items(id),
  FOREIGN KEY (customer_id)   REFERENCES users(id),
  FOREIGN KEY (fulfilled_by)  REFERENCES users(id)
);

-- ============================================================
-- 15. WEBSITE SETTINGS
-- ============================================================

-- Key-value store for all admin-controlled website configuration
CREATE TABLE website_settings (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100)  UNIQUE NOT NULL,
  -- e.g. 'site_logo', 'gcash_number', 'bank_account', 'show_faq_section',
  --       'email_footer', 'checkout_note', 'cod_enabled', 'pickup_enabled'
  value       TEXT,
  group_name  VARCHAR(50),                                    -- e.g. 'payment','display','email'
  updated_by  INT,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- FAQ entries managed by admin
CREATE TABLE faqs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  question    TEXT          NOT NULL,
  answer      TEXT          NOT NULL,
  sort_order  INT           DEFAULT 0,
  is_visible  BOOLEAN       DEFAULT TRUE,
  created_by  INT,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Static page content (About Us, Contact, FAQ intro, etc.)
CREATE TABLE static_pages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(100)  UNIQUE NOT NULL,                  -- e.g. 'about_us', 'contact', 'faq'
  title       VARCHAR(200),
  content     LONGTEXT,
  is_visible  BOOLEAN       DEFAULT TRUE,
  updated_by  INT,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- ============================================================
-- 16. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT,                                        -- recipient (NULL = broadcast)
  type            VARCHAR(50),
  -- e.g. 'order_confirmed', 'payment_verified', 'warranty_approved',
  --       'otp_email', 'blueprint_stage_change'
  title           VARCHAR(200),
  message         TEXT,
  is_read         BOOLEAN       DEFAULT FALSE,
  channel         ENUM('email','system','both') DEFAULT 'system',
  sent_at         DATETIME,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 17. AUDIT LOGS
-- ============================================================

-- System-wide action log for accountability (admin/staff actions)
CREATE TABLE audit_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  action      VARCHAR(100),                                   -- e.g. 'create_product', 'delete_user'
  table_name  VARCHAR(100),
  record_id   INT,
  old_values  JSON,
  new_values  JSON,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- 18. BACKUP LOGS
-- ============================================================

-- Tracks automated (cron) and manual backup events
CREATE TABLE backup_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  type          ENUM('auto','manual') DEFAULT 'auto',
  triggered_by  INT,                                          -- NULL = cron job
  file_name     VARCHAR(255),
  file_size_kb  INT,
  storage_path  TEXT,                                         -- cloud storage URL/path
  status        ENUM('success','failed') DEFAULT 'success',
  notes         TEXT,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (triggered_by) REFERENCES users(id)
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default Admin account (password: Admin@123)
INSERT INTO users (name, email, password, role, is_verified, approval_status, is_active)
VALUES (
  'Administrator',
  'admin@spiralwood.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaX.6IrqJXnq0RbbvO9rGDH9i',
  'admin', TRUE, 'approved', TRUE
);

-- Default website settings
INSERT INTO website_settings (setting_key, value, group_name) VALUES
  ('site_logo',          '',             'display'),
  ('site_name',          'Spiral Wood Services', 'display'),
  ('show_faq_section',   'true',         'display'),
  ('show_about_section', 'true',         'display'),
  ('business_address',   '',             'display'), 
  ('business_phone',     '',             'display'),
  ('cod_enabled',        'true',         'payment'),
  ('cop_enabled',        'true',         'payment'),
  ('gcash_enabled',      'true',         'payment'),
  ('bank_transfer_enabled', 'true',      'payment'),
  ('gcash_number',       '',             'payment'),
  ('bank_account_name',  '',             'payment'),
  ('bank_account_number','',             'payment'),
  ('email_footer',       '',             'email'),
  ('checkout_note',      '',             'email'),
  ('warranty_period_days','365',         'policy'),
  ('cancellation_fee_pct','15',          'policy');

-- Default static pages
INSERT INTO static_pages (slug, title, content, is_visible) VALUES
  ('about_us', 'About Us',   'About Spiral Wood Services...', TRUE),
  ('contact',  'Contact Us', 'Contact information...',        TRUE),
  ('faq',      'FAQ',        '',                              TRUE);

-- ============================================================
-- END OF wisdom_db_updated.sql
-- ============================================================
