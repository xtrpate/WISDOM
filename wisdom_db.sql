-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 24, 2026 at 10:42 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `wisdom_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `purpose` varchar(200) DEFAULT NULL,
  `scheduled_date` datetime DEFAULT NULL,
  `preferred_date` datetime DEFAULT NULL,
  `status` enum('pending','confirmed','done','cancelled') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appointments`
--

INSERT INTO `appointments` (`id`, `order_id`, `customer_id`, `assigned_to`, `purpose`, `scheduled_date`, `preferred_date`, `status`, `notes`, `updated_at`) VALUES
(1, NULL, NULL, 5, 'consultation', '2026-03-20 22:11:00', '2026-03-20 22:11:00', 'pending', NULL, '2026-03-20 14:11:59'),
(2, NULL, 7, NULL, 'Consult', '2026-03-25 08:00:00', '2026-03-25 00:00:00', 'pending', 'Contact: 09123456789', '2026-03-21 16:12:01');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) DEFAULT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `backup_logs`
--

CREATE TABLE `backup_logs` (
  `id` int(11) NOT NULL,
  `type` enum('auto','manual') DEFAULT 'auto',
  `triggered_by` int(11) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_size_kb` int(11) DEFAULT NULL,
  `storage_path` text DEFAULT NULL,
  `status` enum('success','failed') DEFAULT 'success',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bill_of_materials`
--

CREATE TABLE `bill_of_materials` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `raw_material_id` int(11) NOT NULL,
  `quantity` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `blueprints`
--

CREATE TABLE `blueprints` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `base_price` decimal(12,2) DEFAULT 0.00,
  `wood_type` varchar(100) DEFAULT NULL,
  `creator_id` int(11) NOT NULL,
  `client_id` int(11) DEFAULT NULL,
  `assigned_staff_id` int(11) DEFAULT NULL,
  `assign_task_type` varchar(50) DEFAULT NULL,
  `stage` enum('design','estimation','approval','production','delivery','completed','archived') DEFAULT 'design',
  `design_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`design_data`)),
  `view_3d_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`view_3d_data`)),
  `locked_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`locked_fields`)),
  `thumbnail_url` text DEFAULT NULL,
  `source` enum('created','imported') DEFAULT 'created',
  `file_url` text DEFAULT NULL,
  `file_type` varchar(10) DEFAULT NULL,
  `is_template` tinyint(1) DEFAULT 0,
  `is_gallery` tinyint(1) DEFAULT 0,
  `is_deleted` tinyint(1) DEFAULT 0,
  `archived_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `blueprints`
--

INSERT INTO `blueprints` (`id`, `title`, `description`, `base_price`, `wood_type`, `creator_id`, `client_id`, `assigned_staff_id`, `assign_task_type`, `stage`, `design_data`, `view_3d_data`, `locked_fields`, `thumbnail_url`, `source`, `file_url`, `file_type`, `is_template`, `is_gallery`, `is_deleted`, `archived_at`, `created_at`, `updated_at`) VALUES
(3, 'Wooden House Cabinet Blueprint', 'A pre-designed wooden house-style cabinet blueprint ready for custom production.', 0.00, NULL, 1, NULL, NULL, NULL, 'approval', NULL, NULL, NULL, 'uploads/products/wooden-house-blueprint.jpeg', 'created', NULL, NULL, 0, 1, 0, NULL, '2026-03-12 12:42:35', '2026-03-12 12:42:35'),
(4, '123', NULL, 0.00, NULL, 6, NULL, NULL, NULL, 'archived', '{\"components\":[],\"unit\":\"mm\"}', NULL, NULL, NULL, 'created', NULL, NULL, 0, 0, 1, '2026-03-23 00:32:45', '2026-03-21 14:59:04', '2026-03-22 16:32:45'),
(5, 'Furniture1', NULL, 0.00, NULL, 6, NULL, NULL, NULL, 'design', '{\"components\":[],\"unit\":\"mm\"}', NULL, NULL, NULL, 'created', NULL, NULL, 0, 0, 0, NULL, '2026-03-22 16:33:02', '2026-03-22 16:33:02');

-- --------------------------------------------------------

--
-- Table structure for table `blueprint_components`
--

CREATE TABLE `blueprint_components` (
  `id` int(11) NOT NULL,
  `blueprint_id` int(11) NOT NULL,
  `component_type` varchar(100) DEFAULT NULL,
  `label` varchar(150) DEFAULT NULL,
  `width_mm` decimal(8,2) DEFAULT NULL,
  `height_mm` decimal(8,2) DEFAULT NULL,
  `depth_mm` decimal(8,2) DEFAULT NULL,
  `wood_type` varchar(100) DEFAULT NULL,
  `door_style` varchar(100) DEFAULT NULL,
  `hardware` varchar(150) DEFAULT NULL,
  `finish_color` varchar(100) DEFAULT NULL,
  `quantity` int(11) DEFAULT 1,
  `position_x` decimal(8,2) DEFAULT NULL,
  `position_y` decimal(8,2) DEFAULT NULL,
  `is_locked` tinyint(1) DEFAULT 0,
  `raw_material_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `blueprint_revisions`
--

CREATE TABLE `blueprint_revisions` (
  `id` int(11) NOT NULL,
  `blueprint_id` int(11) NOT NULL,
  `revision_number` int(11) DEFAULT 1,
  `stage_at_save` varchar(50) DEFAULT NULL,
  `revision_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`revision_data`)),
  `revised_by` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cancellations`
--

CREATE TABLE `cancellations` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `requested_by` int(11) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `policy_applied` enum('full_refund','processing_fee','non_refundable','voided') DEFAULT NULL,
  `refund_amount` decimal(12,2) DEFAULT 0.00,
  `processing_fee` decimal(12,2) DEFAULT 0.00,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('raw','build','blueprint') DEFAULT 'build'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `type`) VALUES
(1, 'Cabinets', '');

-- --------------------------------------------------------

--
-- Table structure for table `contracts`
--

CREATE TABLE `contracts` (
  `id` int(11) NOT NULL,
  `blueprint_id` int(11) DEFAULT NULL,
  `order_id` int(11) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `customer_name` varchar(200) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `materials_used` text DEFAULT NULL,
  `warranty_terms` text DEFAULT NULL,
  `down_payment` decimal(12,2) DEFAULT 0.00,
  `processing_fee_pct` decimal(5,2) DEFAULT 15.00,
  `is_non_refundable` tinyint(1) DEFAULT 0,
  `authorized_by` int(11) DEFAULT NULL,
  `pdf_url` text DEFAULT NULL,
  `signed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `deliveries`
--

CREATE TABLE `deliveries` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `driver_id` int(11) DEFAULT NULL,
  `scheduled_date` datetime DEFAULT NULL,
  `delivered_date` datetime DEFAULT NULL,
  `address` text DEFAULT NULL,
  `status` enum('scheduled','in_transit','delivered','failed') DEFAULT 'scheduled',
  `signed_receipt` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `deliveries`
--

INSERT INTO `deliveries` (`id`, `order_id`, `driver_id`, `scheduled_date`, `delivered_date`, `address`, `status`, `signed_receipt`, `notes`, `updated_at`) VALUES
(8, 3, 5, '2026-03-20 15:52:00', '2026-03-20 07:52:30', '2131', 'delivered', NULL, '312', '2026-03-20 07:52:30'),
(9, 4, 5, '2026-03-20 15:52:00', NULL, '213', 'scheduled', NULL, '123', '2026-03-20 07:52:41'),
(10, 11, 5, '2026-03-20 18:41:00', '2026-03-20 10:42:23', 'Saog Marilao', 'delivered', NULL, '213', '2026-03-20 10:42:23'),
(11, 27, NULL, '2026-03-25 20:03:00', '2026-03-22 18:06:11', 'Saog Marilao Bulacan', 'delivered', NULL, '123213', '2026-03-22 10:06:11');

-- --------------------------------------------------------

--
-- Table structure for table `estimations`
--

CREATE TABLE `estimations` (
  `id` int(11) NOT NULL,
  `blueprint_id` int(11) NOT NULL,
  `version` int(11) DEFAULT 1,
  `material_cost` decimal(12,2) DEFAULT 0.00,
  `labor_cost` decimal(12,2) DEFAULT 0.00,
  `labor_breakdown` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`labor_breakdown`)),
  `tax` decimal(10,2) DEFAULT 0.00,
  `discount` decimal(10,2) DEFAULT 0.00,
  `grand_total` decimal(12,2) DEFAULT 0.00,
  `estimation_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`estimation_data`)),
  `status` enum('draft','sent','approved','rejected') DEFAULT 'draft',
  `pdf_url` text DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `estimation_items`
--

CREATE TABLE `estimation_items` (
  `id` int(11) NOT NULL,
  `estimation_id` int(11) NOT NULL,
  `component_id` int(11) DEFAULT NULL,
  `raw_material_id` int(11) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `quantity` decimal(10,2) DEFAULT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `subtotal` decimal(12,2) GENERATED ALWAYS AS (`quantity` * `unit_cost`) STORED
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `faqs`
--

CREATE TABLE `faqs` (
  `id` int(11) NOT NULL,
  `question` text NOT NULL,
  `answer` text NOT NULL,
  `sort_order` int(11) DEFAULT 0,
  `is_visible` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `title` varchar(200) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `channel` enum('email','system','both') DEFAULT 'system',
  `sent_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `order_number` varchar(50) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `walkin_customer_name` varchar(150) DEFAULT NULL,
  `walkin_customer_phone` varchar(20) DEFAULT NULL,
  `type` enum('online','walkin') DEFAULT 'online',
  `order_type` enum('standard','blueprint') DEFAULT 'standard',
  `status` enum('pending','confirmed','production','shipping','delivered','completed','cancelled') DEFAULT 'pending',
  `payment_method` enum('cash','gcash','bank_transfer','cod','cop') DEFAULT 'cash',
  `payment_status` enum('unpaid','partial','paid') DEFAULT 'unpaid',
  `subtotal` decimal(12,2) DEFAULT 0.00,
  `tax` decimal(10,2) DEFAULT 0.00,
  `discount` decimal(10,2) DEFAULT 0.00,
  `total` decimal(12,2) DEFAULT 0.00,
  `cash_received` decimal(10,2) DEFAULT NULL,
  `change` decimal(10,2) NOT NULL DEFAULT 0.00,
  `down_payment` decimal(12,2) DEFAULT 0.00,
  `payment_proof` text DEFAULT NULL,
  `delivery_address` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `blueprint_id` int(11) DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `refund_amount` decimal(12,2) DEFAULT 0.00,
  `refund_status` enum('none','pending','processed') DEFAULT 'none',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `order_number`, `customer_id`, `walkin_customer_name`, `walkin_customer_phone`, `type`, `order_type`, `status`, `payment_method`, `payment_status`, `subtotal`, `tax`, `discount`, `total`, `cash_received`, `change`, `down_payment`, `payment_proof`, `delivery_address`, `notes`, `blueprint_id`, `cancellation_reason`, `cancelled_at`, `refund_amount`, `refund_status`, `created_at`, `updated_at`) VALUES
(3, 'SWS-20260311-3755', 4, 'John Marc Aquino', '09934391473', 'online', 'standard', 'shipping', 'cod', 'unpaid', 21000.00, 0.00, 0.00, 21000.00, NULL, 0.00, 0.00, NULL, 'PDM, Marilao, Bulacan', '', NULL, NULL, NULL, 0.00, 'none', '2026-03-11 11:42:25', '2026-03-20 06:16:31'),
(4, 'WLK-20260320-7167', NULL, 'Jericho', '09530695310', 'walkin', 'standard', 'shipping', 'cash', 'paid', 14500.00, 0.00, 0.00, 14500.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 04:22:19', '2026-03-20 07:07:55'),
(5, 'WLK-20260320-5850', NULL, 'jericho', '09530695310', 'walkin', 'standard', 'shipping', 'cash', 'paid', 8500.00, 0.00, 0.00, 8500.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 04:29:05', '2026-03-20 07:24:13'),
(6, 'WLK-20260320-1338', NULL, '1`3123', '21321321321', 'walkin', 'standard', 'confirmed', 'gcash', 'paid', 14500.00, 0.00, 0.00, 14500.00, NULL, 0.00, 0.00, NULL, NULL, '123', NULL, NULL, NULL, 0.00, 'none', '2026-03-20 04:32:26', '2026-03-20 04:32:26'),
(7, 'WLK-20260320-3649', NULL, '12321', '213213', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 14500.00, 0.00, 0.00, 14500.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 04:32:42', '2026-03-20 04:32:42'),
(8, 'WLK-20260320-1512', NULL, 'jericho', '12321', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 11500.00, 0.00, 0.00, 11500.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 04:34:25', '2026-03-20 04:34:25'),
(9, 'WLK-20260320-1890', NULL, 'jericho', '0959182321', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 14500.00, 0.00, 0.00, 14500.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 04:37:06', '2026-03-20 04:37:06'),
(10, 'WLK-20260320-4937', NULL, 'jericho', '123123213', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 14500.00, 0.00, 0.00, 14500.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 04:38:21', '2026-03-20 04:38:21'),
(11, 'WLK-20260320-3448', NULL, 'Jericho', '084358731', 'walkin', 'standard', 'shipping', 'cash', 'paid', 14500.00, 0.00, 0.00, 14500.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 04:45:30', '2026-03-20 10:41:49'),
(12, 'WLK-20260320-4970', NULL, '1312213', '352413231', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 11500.00, 0.00, 0.00, 11500.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 04:50:11', '2026-03-20 04:50:11'),
(13, 'WLK-20260320-5504', NULL, '123', '12321', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 11500.00, 0.00, 0.00, 11500.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 04:57:28', '2026-03-20 04:57:28'),
(14, 'WLK-20260320-5689', NULL, '213', '123213', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 11500.00, 0.00, 0.00, 11500.00, 15000.00, 3500.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 04:58:18', '2026-03-20 04:58:18'),
(15, 'WLK-20260320-3693', NULL, '12321', '12321', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 11500.00, 0.00, 0.00, 11500.00, 15000.00, 3500.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 05:05:47', '2026-03-20 05:05:47'),
(16, 'WLK-20260320-2797', NULL, 'mark', '12412321312', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 8500.00, 0.00, 0.00, 8500.00, 15000.00, 6500.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 12:03:00', '2026-03-20 12:03:00'),
(17, 'WLK-20260320-9303', NULL, 'robin', '817238921', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 8500.00, 0.00, 0.00, 8500.00, 15000.00, 6500.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 12:03:53', '2026-03-20 12:03:53'),
(18, 'WLK-20260320-5636', NULL, '123', '12321313', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 29000.00, 0.00, 0.00, 29000.00, 150000.00, 121000.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 12:47:27', '2026-03-20 12:47:27'),
(19, 'WLK-20260320-3854', NULL, 'Jericho', '0951231123', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 102000.00, 0.00, 0.00, 102000.00, 103000.00, 1000.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 13:40:05', '2026-03-20 13:40:05'),
(20, 'WLK-20260320-9229', NULL, 'jericho', '0958121', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 11500.00, 0.00, 0.00, 11500.00, 12000.00, 500.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 13:42:10', '2026-03-20 13:42:10'),
(21, 'WLK-20260320-2465', NULL, 'Jericho', '09530695310', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 54400.00, 0.00, 0.00, 54400.00, 60000.00, 5600.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 14:02:41', '2026-03-20 14:02:41'),
(22, 'WLK-20260320-6730', NULL, 'Jericho', '09530695310', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 24000.00, 0.00, 0.00, 24000.00, 25000.00, 1000.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 14:04:37', '2026-03-20 14:04:37'),
(23, 'WLK-20260320-8384', NULL, 'Jericho', '09530695310', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 21000.00, 0.00, 0.00, 21000.00, 24000.00, 3000.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 14:05:49', '2026-03-20 14:05:49'),
(24, 'WLK-20260320-6543', NULL, 'Jericho', '09530695310', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 21000.00, 0.00, 0.00, 21000.00, 22000.00, 1000.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-20 14:06:17', '2026-03-20 14:06:17'),
(25, 'SWS-20260321-7750', 7, 'Sample Customer', '09123456789', 'online', 'standard', 'pending', 'cod', 'unpaid', 29500.00, 0.00, 0.00, 29500.00, NULL, 0.00, 0.00, NULL, 'Sample Address', '', NULL, NULL, NULL, 0.00, 'none', '2026-03-21 16:11:23', '2026-03-21 16:11:23'),
(26, 'SWS-20260322-4524', 7, 'Sample Customer', '09123456789', 'online', 'standard', 'pending', 'cod', 'unpaid', 8500.00, 0.00, 0.00, 8500.00, NULL, 0.00, 0.00, NULL, 'Sample Address', '', NULL, NULL, NULL, 0.00, 'none', '2026-03-22 09:57:08', '2026-03-22 09:57:08'),
(27, 'WLK-20260322-4669', NULL, 'aquino', '09530695310', 'walkin', 'standard', 'delivered', 'cash', 'paid', 32500.00, 0.00, 0.00, 32500.00, 33000.00, 500.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-22 10:02:44', '2026-03-22 10:06:11'),
(28, 'SWS-20260322-3082', 7, 'Sample Customer', '09123456789', 'online', 'standard', 'pending', 'cod', 'unpaid', 29500.00, 0.00, 0.00, 29500.00, NULL, 0.00, 0.00, NULL, 'Sample Address', '', NULL, NULL, NULL, 0.00, 'none', '2026-03-22 16:50:59', '2026-03-22 16:50:59'),
(29, 'WLK-20260323-9289', NULL, 'jericho', '09530695310', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 23000.00, 0.00, 0.00, 23000.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-23 14:11:48', '2026-03-23 14:11:48'),
(30, 'WLK-20260323-8594', NULL, 'Robin', '09530695310', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 11500.00, 0.00, 0.00, 11500.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-23 14:30:09', '2026-03-23 14:30:09'),
(34, 'WLK-20260323-8541', NULL, '123', '09812371222', 'walkin', 'standard', 'confirmed', 'cash', 'paid', 11500.00, 0.00, 0.00, 11500.00, NULL, 0.00, 0.00, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 'none', '2026-03-23 14:41:04', '2026-03-23 14:41:04'),
(35, 'SWS-20260323-6120', 7, 'Sample Customer', '09123456789', 'online', 'standard', 'pending', 'cod', 'unpaid', 8500.00, 0.00, 0.00, 8500.00, NULL, 0.00, 0.00, NULL, 'Sample Address', '', NULL, NULL, NULL, 0.00, 'none', '2026-03-23 15:03:13', '2026-03-23 15:03:13');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `variation_id` int(11) DEFAULT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `quantity` int(11) DEFAULT 1,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `production_cost` decimal(10,2) DEFAULT NULL,
  `profit_margin` decimal(10,2) GENERATED ALWAYS AS (`unit_price` - `production_cost`) STORED,
  `subtotal` decimal(10,2) GENERATED ALWAYS AS (`quantity` * `unit_price`) STORED
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `variation_id`, `product_name`, `quantity`, `unit_price`, `production_cost`) VALUES
(1, 3, 6, NULL, 'Modern Walnut Cabinet', 1, 12500.00, NULL),
(2, 3, 5, NULL, 'Classic Oak Cabinet', 1, 8500.00, NULL),
(3, 4, 10, NULL, 'POS Test Cabinet Premium', 1, 14500.00, 9100.00),
(4, 5, 8, NULL, 'POS Test Cabinet Small', 1, 8500.00, 4800.00),
(5, 6, 10, NULL, 'POS Test Cabinet Premium', 1, 14500.00, 9100.00),
(6, 7, 10, NULL, 'POS Test Cabinet Premium', 1, 14500.00, 9100.00),
(7, 8, 9, NULL, 'POS Test Cabinet Medium', 1, 11500.00, 6800.00),
(8, 9, 10, NULL, 'POS Test Cabinet Premium', 1, 14500.00, 9100.00),
(9, 10, 10, NULL, 'POS Test Cabinet Premium', 1, 14500.00, 9100.00),
(10, 11, 10, NULL, 'POS Test Cabinet Premium', 1, 14500.00, 9100.00),
(11, 12, 9, NULL, 'POS Test Cabinet Medium', 1, 11500.00, 6800.00),
(12, 13, 9, NULL, 'POS Test Cabinet Medium', 1, 11500.00, 6800.00),
(13, 14, 9, NULL, 'POS Test Cabinet Medium', 1, 11500.00, 6800.00),
(14, 15, 9, NULL, 'POS Test Cabinet Medium', 1, 11500.00, 6800.00),
(15, 16, 8, NULL, 'POS Test Cabinet Small', 1, 8500.00, 4800.00),
(16, 17, 8, NULL, 'POS Test Cabinet Small', 1, 8500.00, 4800.00),
(17, 18, 10, NULL, 'POS Test Cabinet Premium', 2, 14500.00, 9100.00),
(18, 19, 8, NULL, 'POS Test Cabinet Small', 12, 8500.00, 4800.00),
(19, 20, 9, NULL, 'POS Test Cabinet Medium', 1, 11500.00, 6800.00),
(20, 21, 7, NULL, 'Rustic Pine Cabinet', 8, 6800.00, 3500.00),
(21, 22, 6, NULL, 'Modern Walnut Cabinet', 1, 12500.00, 6800.00),
(22, 22, 9, NULL, 'POS Test Cabinet Medium', 1, 11500.00, 6800.00),
(23, 23, 6, NULL, 'Modern Walnut Cabinet', 1, 12500.00, 6800.00),
(24, 23, 5, NULL, 'Classic Oak Cabinet', 1, 8500.00, 4200.00),
(25, 24, 5, NULL, 'Classic Oak Cabinet', 1, 8500.00, 4200.00),
(26, 24, 6, NULL, 'Modern Walnut Cabinet', 1, 12500.00, 6800.00),
(27, 25, 5, NULL, 'Classic Oak Cabinet', 2, 8500.00, NULL),
(28, 25, 6, NULL, 'Modern Walnut Cabinet', 1, 12500.00, NULL),
(29, 26, 5, NULL, 'Classic Oak Cabinet', 1, 8500.00, NULL),
(30, 27, 5, NULL, 'Classic Oak Cabinet', 1, 8500.00, 4200.00),
(31, 27, 6, NULL, 'Modern Walnut Cabinet', 1, 12500.00, 6800.00),
(32, 27, 9, NULL, 'POS Test Cabinet Medium', 1, 11500.00, 6800.00),
(33, 28, 5, NULL, 'Classic Oak Cabinet', 2, 8500.00, NULL),
(34, 28, 6, NULL, 'Modern Walnut Cabinet', 1, 12500.00, NULL),
(35, 29, 9, NULL, 'POS Test Cabinet Medium', 2, 11500.00, 6800.00),
(36, 30, 9, NULL, 'POS Test Cabinet Medium', 1, 11500.00, 6800.00),
(40, 34, 9, NULL, 'POS Test Cabinet Medium', 1, 11500.00, 6800.00),
(41, 35, 5, NULL, 'Classic Oak Cabinet', 1, 8500.00, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `password_resets`
--

CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_transactions`
--

CREATE TABLE `payment_transactions` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_method` enum('cash','gcash','bank_transfer','cod','cop') DEFAULT NULL,
  `proof_url` text DEFAULT NULL,
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `status` enum('pending','verified','rejected') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment_transactions`
--

INSERT INTO `payment_transactions` (`id`, `order_id`, `amount`, `payment_method`, `proof_url`, `verified_by`, `verified_at`, `status`, `notes`, `created_at`) VALUES
(1, 4, 14500.00, 'cash', NULL, 5, '2026-03-20 12:22:19', 'verified', NULL, '2026-03-20 04:22:19'),
(2, 5, 8500.00, 'cash', NULL, 5, '2026-03-20 12:29:05', 'verified', NULL, '2026-03-20 04:29:05'),
(3, 6, 14500.00, 'gcash', NULL, 5, '2026-03-20 12:32:26', 'verified', NULL, '2026-03-20 04:32:26'),
(4, 7, 14500.00, 'cash', NULL, 5, '2026-03-20 12:32:42', 'verified', NULL, '2026-03-20 04:32:42'),
(5, 8, 11500.00, 'cash', NULL, 5, '2026-03-20 12:34:25', 'verified', NULL, '2026-03-20 04:34:25'),
(6, 9, 14500.00, 'cash', NULL, 5, '2026-03-20 12:37:06', 'verified', NULL, '2026-03-20 04:37:06'),
(7, 10, 14500.00, 'cash', NULL, 5, '2026-03-20 12:38:21', 'verified', NULL, '2026-03-20 04:38:21'),
(8, 11, 14500.00, 'cash', NULL, 5, '2026-03-20 12:45:30', 'verified', NULL, '2026-03-20 04:45:30'),
(9, 12, 11500.00, 'cash', NULL, 5, '2026-03-20 12:50:11', 'verified', NULL, '2026-03-20 04:50:11'),
(10, 13, 11500.00, 'cash', NULL, 5, '2026-03-20 12:57:28', 'verified', NULL, '2026-03-20 04:57:28'),
(11, 14, 11500.00, 'cash', NULL, 5, '2026-03-20 12:58:18', 'verified', NULL, '2026-03-20 04:58:18'),
(12, 15, 11500.00, 'cash', NULL, 5, '2026-03-20 13:05:47', 'verified', NULL, '2026-03-20 05:05:47'),
(13, 16, 8500.00, 'cash', NULL, 5, '2026-03-20 20:03:00', 'verified', NULL, '2026-03-20 12:03:00'),
(14, 17, 8500.00, 'cash', NULL, 5, '2026-03-20 20:03:53', 'verified', NULL, '2026-03-20 12:03:53'),
(15, 18, 29000.00, 'cash', NULL, 5, '2026-03-20 20:47:27', 'verified', NULL, '2026-03-20 12:47:27'),
(16, 19, 102000.00, 'cash', NULL, 5, '2026-03-20 21:40:05', 'verified', NULL, '2026-03-20 13:40:05'),
(17, 20, 11500.00, 'cash', NULL, 5, '2026-03-20 21:42:11', 'verified', NULL, '2026-03-20 13:42:11'),
(18, 21, 54400.00, 'cash', NULL, 5, '2026-03-20 22:02:41', 'verified', NULL, '2026-03-20 14:02:41'),
(19, 22, 24000.00, 'cash', NULL, 5, '2026-03-20 22:04:37', 'verified', NULL, '2026-03-20 14:04:37'),
(20, 23, 21000.00, 'cash', NULL, 5, '2026-03-20 22:05:49', 'verified', NULL, '2026-03-20 14:05:49'),
(21, 24, 21000.00, 'cash', NULL, 5, '2026-03-20 22:06:17', 'verified', NULL, '2026-03-20 14:06:17'),
(22, 27, 32500.00, 'cash', NULL, 5, '2026-03-22 18:02:44', 'verified', NULL, '2026-03-22 10:02:44'),
(23, 29, 23000.00, 'cash', NULL, 5, '2026-03-23 22:11:48', 'verified', NULL, '2026-03-23 14:11:48'),
(24, 30, 11500.00, 'cash', NULL, 5, '2026-03-23 22:30:09', 'verified', NULL, '2026-03-23 14:30:09'),
(28, 34, 11500.00, 'cash', NULL, 5, '2026-03-23 22:41:04', 'verified', NULL, '2026-03-23 14:41:04');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `type` enum('standard','blueprint') DEFAULT 'standard',
  `image_url` text DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT 0,
  `online_price` decimal(10,2) DEFAULT 0.00,
  `walkin_price` decimal(10,2) DEFAULT 0.00,
  `production_cost` decimal(10,2) DEFAULT 0.00,
  `profit_margin` decimal(10,2) GENERATED ALWAYS AS (`walkin_price` - `production_cost`) STORED,
  `stock` int(11) DEFAULT 0,
  `reorder_point` int(11) DEFAULT 0,
  `stock_status` enum('in_stock','low_stock','out_of_stock') DEFAULT 'in_stock',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `barcode`, `name`, `description`, `category_id`, `type`, `image_url`, `is_featured`, `online_price`, `walkin_price`, `production_cost`, `stock`, `reorder_point`, `stock_status`, `created_at`, `updated_at`) VALUES
(5, NULL, 'Classic Oak Cabinet', 'A sturdy and elegant oak wood cabinet with 3 shelves and smooth finish. Perfect for living rooms and offices.', 1, 'standard', 'uploads/products/cabinet-oak.jpeg', 1, 8500.00, 8500.00, 4200.00, 10, 5, 'in_stock', '2026-03-10 15:16:41', '2026-03-23 15:03:13'),
(6, NULL, 'Modern Walnut Cabinet', 'Sleek modern design walnut cabinet with soft-close doors and adjustable shelving. Ideal for bedrooms.', 1, 'standard', 'uploads/products/cabinet-walnut.jpeg', 1, 12500.00, 12500.00, 6800.00, 8, 5, 'in_stock', '2026-03-10 15:16:41', '2026-03-22 16:50:59'),
(7, NULL, 'Rustic Pine Cabinet', 'Handcrafted rustic pine wood cabinet with vintage hardware. Adds a warm natural feel to any room.', 1, 'standard', 'uploads/products/cabinet-pine.jpeg', 0, 6800.00, 6800.00, 3500.00, 0, 5, 'out_of_stock', '2026-03-10 15:16:41', '2026-03-20 14:02:41'),
(8, 'WDM-CAB-1001', 'POS Test Cabinet Small', 'Sample cabinet product for POS testing.', 1, 'standard', NULL, 0, 8500.00, 8500.00, 4800.00, 0, 5, 'out_of_stock', '2026-03-20 04:19:32', '2026-03-20 13:40:05'),
(9, 'WDM-CAB-1002', 'POS Test Cabinet Medium', 'Sample cabinet product for POS testing.', 1, 'standard', NULL, 0, 11500.00, 11500.00, 6800.00, 0, 5, 'out_of_stock', '2026-03-20 04:19:32', '2026-03-23 14:41:04'),
(10, 'WDM-CAB-1003', 'POS Test Cabinet Premium', 'Sample cabinet product for POS testing.', 1, 'standard', NULL, 1, 14500.00, 14500.00, 9100.00, 0, 3, 'out_of_stock', '2026-03-20 04:19:32', '2026-03-20 12:47:27');

-- --------------------------------------------------------

--
-- Table structure for table `product_variations`
--

CREATE TABLE `product_variations` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `variation_type` varchar(50) DEFAULT NULL,
  `variation_value` varchar(100) DEFAULT NULL,
  `variation_name` varchar(100) DEFAULT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `selling_price` decimal(10,2) DEFAULT NULL,
  `profit_margin` decimal(10,2) GENERATED ALWAYS AS (`selling_price` - `unit_cost`) STORED,
  `stock` int(11) DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `raw_materials`
--

CREATE TABLE `raw_materials` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `quantity` decimal(10,2) DEFAULT 0.00,
  `reorder_point` decimal(10,2) DEFAULT 0.00,
  `unit_cost` decimal(10,2) DEFAULT 0.00,
  `supplier_id` int(11) DEFAULT NULL,
  `stock_status` enum('in_stock','low_stock','out_of_stock') DEFAULT 'in_stock',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `raw_materials`
--

INSERT INTO `raw_materials` (`id`, `name`, `category_id`, `unit`, `quantity`, `reorder_point`, `unit_cost`, `supplier_id`, `stock_status`, `created_at`, `updated_at`) VALUES
(1, 'Raw', NULL, '12', 2.00, 2.00, 20.00, 1, 'low_stock', '2026-03-21 15:00:31', '2026-03-21 15:00:31');

-- --------------------------------------------------------

--
-- Table structure for table `receipts`
--

CREATE TABLE `receipts` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `receipt_number` varchar(50) DEFAULT NULL,
  `issued_to` varchar(200) DEFAULT NULL,
  `issued_by` int(11) DEFAULT NULL,
  `total_amount` decimal(12,2) DEFAULT NULL,
  `cash_received` decimal(10,2) DEFAULT NULL,
  `change_amount` decimal(10,2) DEFAULT NULL,
  `items_snapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`items_snapshot`)),
  `signature_url` text DEFAULT NULL,
  `printed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `receipts`
--

INSERT INTO `receipts` (`id`, `order_id`, `receipt_number`, `issued_to`, `issued_by`, `total_amount`, `cash_received`, `change_amount`, `items_snapshot`, `signature_url`, `printed_at`, `created_at`) VALUES
(1, 4, 'OR-1773980539307', 'Jericho', 5, 14500.00, NULL, NULL, '[{\"key\":\"10\",\"product_id\":10,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Premium\",\"unit_price\":14500,\"production_cost\":9100,\"quantity\":1,\"max_stock\":8}]', NULL, '2026-03-20 12:22:19', '2026-03-20 04:22:19'),
(2, 5, 'OR-1773980945434', 'jericho', 5, 8500.00, NULL, NULL, '[{\"key\":\"8\",\"product_id\":8,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Small\",\"unit_price\":8500,\"production_cost\":4800,\"quantity\":1,\"max_stock\":15}]', NULL, '2026-03-20 12:29:05', '2026-03-20 04:29:05'),
(3, 6, 'OR-1773981146608', '1`3123', 5, 14500.00, NULL, NULL, '[{\"key\":\"10\",\"product_id\":10,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Premium\",\"unit_price\":14500,\"production_cost\":9100,\"quantity\":1,\"max_stock\":7}]', NULL, '2026-03-20 12:32:26', '2026-03-20 04:32:26'),
(4, 7, 'OR-1773981162723', '12321', 5, 14500.00, NULL, NULL, '[{\"key\":\"10\",\"product_id\":10,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Premium\",\"unit_price\":14500,\"production_cost\":9100,\"quantity\":1,\"max_stock\":6}]', NULL, '2026-03-20 12:32:42', '2026-03-20 04:32:42'),
(5, 8, 'OR-1773981265392', 'jericho', 5, 11500.00, NULL, NULL, '[{\"key\":\"9\",\"product_id\":9,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Medium\",\"unit_price\":11500,\"production_cost\":6800,\"quantity\":1,\"max_stock\":12}]', NULL, '2026-03-20 12:34:25', '2026-03-20 04:34:25'),
(6, 9, 'OR-1773981426555', 'jericho', 5, 14500.00, NULL, NULL, '[{\"key\":\"10\",\"product_id\":10,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Premium\",\"unit_price\":14500,\"production_cost\":9100,\"quantity\":1,\"max_stock\":5}]', NULL, '2026-03-20 12:37:06', '2026-03-20 04:37:06'),
(7, 10, 'OR-1773981501987', 'jericho', 5, 14500.00, NULL, NULL, '[{\"key\":\"10\",\"product_id\":10,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Premium\",\"unit_price\":14500,\"production_cost\":9100,\"quantity\":1,\"max_stock\":4}]', NULL, '2026-03-20 12:38:21', '2026-03-20 04:38:21'),
(8, 11, 'OR-1773981930741', 'Jericho', 5, 14500.00, NULL, NULL, '[{\"key\":\"10\",\"product_id\":10,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Premium\",\"unit_price\":14500,\"production_cost\":9100,\"quantity\":1,\"max_stock\":3}]', NULL, '2026-03-20 12:45:30', '2026-03-20 04:45:30'),
(9, 12, 'OR-1773982211373', '1312213', 5, 11500.00, NULL, NULL, '[{\"key\":\"9\",\"product_id\":9,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Medium\",\"unit_price\":11500,\"production_cost\":6800,\"quantity\":1,\"max_stock\":11}]', NULL, '2026-03-20 12:50:11', '2026-03-20 04:50:11'),
(10, 13, 'OR-1773982648500', '123', 5, 11500.00, NULL, NULL, '[{\"key\":\"9\",\"product_id\":9,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Medium\",\"unit_price\":11500,\"production_cost\":6800,\"quantity\":1,\"max_stock\":10}]', NULL, '2026-03-20 12:57:28', '2026-03-20 04:57:28'),
(11, 14, 'OR-1773982698977', '213', 5, 11500.00, NULL, NULL, '[{\"product_id\":9,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Medium\",\"quantity\":1,\"unit_price\":11500,\"production_cost\":6800}]', NULL, '2026-03-20 12:58:18', '2026-03-20 04:58:18'),
(12, 15, 'OR-1773983147102', '12321', 5, 11500.00, NULL, NULL, '[{\"product_id\":9,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Medium\",\"quantity\":1,\"unit_price\":11500,\"production_cost\":6800}]', NULL, '2026-03-20 13:05:47', '2026-03-20 05:05:47'),
(13, 16, 'OR-1774008180119', 'mark', 5, 8500.00, NULL, NULL, '[{\"product_id\":8,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Small\",\"quantity\":1,\"unit_price\":8500,\"production_cost\":4800}]', NULL, '2026-03-20 20:03:00', '2026-03-20 12:03:00'),
(14, 17, 'OR-1774008233543', 'robin', 5, 8500.00, NULL, NULL, '[{\"product_id\":8,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Small\",\"quantity\":1,\"unit_price\":8500,\"production_cost\":4800}]', NULL, '2026-03-20 20:03:53', '2026-03-20 12:03:53'),
(15, 18, 'OR-1774010847704', '123', 5, 29000.00, NULL, NULL, '[{\"product_id\":10,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Premium\",\"quantity\":2,\"unit_price\":14500,\"production_cost\":9100}]', NULL, '2026-03-20 20:47:27', '2026-03-20 12:47:27'),
(16, 19, 'OR-1774014005616', 'Jericho', 5, 102000.00, NULL, NULL, '[{\"product_id\":8,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Small\",\"quantity\":12,\"unit_price\":8500,\"production_cost\":4800}]', NULL, '2026-03-20 21:40:05', '2026-03-20 13:40:05'),
(17, 20, 'OR-1774014131016', 'jericho', 5, 11500.00, NULL, NULL, '[{\"product_id\":9,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Medium\",\"quantity\":1,\"unit_price\":11500,\"production_cost\":6800}]', NULL, '2026-03-20 21:42:11', '2026-03-20 13:42:11'),
(18, 21, 'OR-1774015361624', 'Jericho', 5, 54400.00, NULL, NULL, '[{\"product_id\":7,\"variation_id\":null,\"product_name\":\"Rustic Pine Cabinet\",\"quantity\":8,\"unit_price\":6800,\"production_cost\":3500}]', NULL, '2026-03-20 22:02:41', '2026-03-20 14:02:41'),
(19, 22, 'OR-1774015477120', 'Jericho', 5, 24000.00, NULL, NULL, '[{\"product_id\":6,\"variation_id\":null,\"product_name\":\"Modern Walnut Cabinet\",\"quantity\":1,\"unit_price\":12500,\"production_cost\":6800},{\"product_id\":9,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Medium\",\"quantity\":1,\"unit_price\":11500,\"production_cost\":6800}]', NULL, '2026-03-20 22:04:37', '2026-03-20 14:04:37'),
(20, 23, 'OR-1774015549761', 'Jericho', 5, 21000.00, NULL, NULL, '[{\"product_id\":6,\"variation_id\":null,\"product_name\":\"Modern Walnut Cabinet\",\"quantity\":1,\"unit_price\":12500,\"production_cost\":6800},{\"product_id\":5,\"variation_id\":null,\"product_name\":\"Classic Oak Cabinet\",\"quantity\":1,\"unit_price\":8500,\"production_cost\":4200}]', NULL, '2026-03-20 22:05:49', '2026-03-20 14:05:49'),
(21, 24, 'OR-1774015577198', 'Jericho', 5, 21000.00, NULL, NULL, '[{\"product_id\":5,\"variation_id\":null,\"product_name\":\"Classic Oak Cabinet\",\"quantity\":1,\"unit_price\":8500,\"production_cost\":4200},{\"product_id\":6,\"variation_id\":null,\"product_name\":\"Modern Walnut Cabinet\",\"quantity\":1,\"unit_price\":12500,\"production_cost\":6800}]', NULL, '2026-03-20 22:06:17', '2026-03-20 14:06:17'),
(22, 27, 'OR-1774173764512', 'aquino', 5, 32500.00, NULL, NULL, '[{\"product_id\":5,\"variation_id\":null,\"product_name\":\"Classic Oak Cabinet\",\"quantity\":1,\"unit_price\":8500,\"production_cost\":4200},{\"product_id\":6,\"variation_id\":null,\"product_name\":\"Modern Walnut Cabinet\",\"quantity\":1,\"unit_price\":12500,\"production_cost\":6800},{\"product_id\":9,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Medium\",\"quantity\":1,\"unit_price\":11500,\"production_cost\":6800}]', NULL, '2026-03-22 18:02:44', '2026-03-22 10:02:44'),
(23, 29, 'OR-1774275108546', 'jericho', 5, 23000.00, NULL, NULL, '[{\"key\":\"9\",\"product_id\":9,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Medium\",\"unit_price\":11500,\"production_cost\":6800,\"quantity\":2,\"max_stock\":4}]', NULL, '2026-03-23 22:11:48', '2026-03-23 14:11:48'),
(24, 30, 'OR-1774276209811', 'Robin', 5, 11500.00, NULL, NULL, '[{\"key\":\"9\",\"product_id\":9,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Medium\",\"unit_price\":11500,\"production_cost\":6800,\"quantity\":1,\"max_stock\":2}]', NULL, '2026-03-23 22:30:09', '2026-03-23 14:30:09'),
(25, 34, 'OR-1774276864239', '123', 5, 11500.00, 12311.00, 811.00, '[{\"key\":\"9\",\"product_id\":9,\"variation_id\":null,\"product_name\":\"POS Test Cabinet Medium\",\"unit_price\":11500,\"production_cost\":6800,\"quantity\":1,\"max_stock\":1}]', NULL, '2026-03-23 22:41:04', '2026-03-23 14:41:04');

-- --------------------------------------------------------

--
-- Table structure for table `static_pages`
--

CREATE TABLE `static_pages` (
  `id` int(11) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `is_visible` tinyint(1) DEFAULT 1,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `static_pages`
--

INSERT INTO `static_pages` (`id`, `slug`, `title`, `content`, `is_visible`, `updated_by`, `updated_at`) VALUES
(1, 'about_us', 'About Us', 'About Spiral Wood Services...', 1, NULL, '2026-03-04 14:25:20'),
(2, 'contact', 'Contact Us', 'Contact information...', 1, NULL, '2026-03-04 14:25:20'),
(3, 'faq', 'FAQ', '', 1, NULL, '2026-03-04 14:25:20');

-- --------------------------------------------------------

--
-- Table structure for table `stock_movements`
--

CREATE TABLE `stock_movements` (
  `id` int(11) NOT NULL,
  `material_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `type` enum('in','out','adjustment','return') DEFAULT 'in',
  `quantity` decimal(10,2) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `order_id` int(11) DEFAULT NULL,
  `order_item_id` int(11) DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_movements`
--

INSERT INTO `stock_movements` (`id`, `material_id`, `product_id`, `type`, `quantity`, `supplier_id`, `order_id`, `order_item_id`, `reference`, `notes`, `created_by`, `created_at`) VALUES
(1, NULL, 10, 'out', 1.00, NULL, 4, 3, NULL, 'POS walk-in sale', 5, '2026-03-20 04:22:19'),
(2, NULL, 8, 'out', 1.00, NULL, 5, 4, NULL, 'POS walk-in sale', 5, '2026-03-20 04:29:05'),
(3, NULL, 10, 'out', 1.00, NULL, 6, 5, NULL, 'POS walk-in sale', 5, '2026-03-20 04:32:26'),
(4, NULL, 10, 'out', 1.00, NULL, 7, 6, NULL, 'POS walk-in sale', 5, '2026-03-20 04:32:42'),
(5, NULL, 9, 'out', 1.00, NULL, 8, 7, NULL, 'POS walk-in sale', 5, '2026-03-20 04:34:25'),
(6, NULL, 10, 'out', 1.00, NULL, 9, 8, NULL, 'POS walk-in sale', 5, '2026-03-20 04:37:06'),
(7, NULL, 10, 'out', 1.00, NULL, 10, 9, NULL, 'POS walk-in sale', 5, '2026-03-20 04:38:21'),
(8, NULL, 10, 'out', 1.00, NULL, 11, 10, NULL, 'POS walk-in sale', 5, '2026-03-20 04:45:30'),
(9, NULL, 9, 'out', 1.00, NULL, 12, 11, NULL, 'POS walk-in sale', 5, '2026-03-20 04:50:11'),
(10, NULL, 9, 'out', 1.00, NULL, 13, 12, NULL, 'POS walk-in sale', 5, '2026-03-20 04:57:28'),
(11, NULL, 9, 'out', 1.00, NULL, 14, 13, NULL, 'POS walk-in sale', 5, '2026-03-20 04:58:18'),
(12, NULL, 9, 'out', 1.00, NULL, 15, 14, NULL, 'POS walk-in sale', 5, '2026-03-20 05:05:47'),
(13, NULL, 8, 'out', 1.00, NULL, 16, 15, NULL, 'POS walk-in sale', 5, '2026-03-20 12:03:00'),
(14, NULL, 8, 'out', 1.00, NULL, 17, 16, NULL, 'POS walk-in sale', 5, '2026-03-20 12:03:53'),
(15, NULL, 10, 'out', 2.00, NULL, 18, 17, NULL, 'POS walk-in sale', 5, '2026-03-20 12:47:27'),
(16, NULL, 8, 'out', 12.00, NULL, 19, 18, NULL, 'POS walk-in sale', 5, '2026-03-20 13:40:05'),
(17, NULL, 9, 'out', 1.00, NULL, 20, 19, NULL, 'POS walk-in sale', 5, '2026-03-20 13:42:11'),
(18, NULL, 7, 'out', 8.00, NULL, 21, 20, NULL, 'POS walk-in sale', 5, '2026-03-20 14:02:41'),
(19, NULL, 6, 'out', 1.00, NULL, 22, 21, NULL, 'POS walk-in sale', 5, '2026-03-20 14:04:37'),
(20, NULL, 9, 'out', 1.00, NULL, 22, 22, NULL, 'POS walk-in sale', 5, '2026-03-20 14:04:37'),
(21, NULL, 6, 'out', 1.00, NULL, 23, 23, NULL, 'POS walk-in sale', 5, '2026-03-20 14:05:49'),
(22, NULL, 5, 'out', 1.00, NULL, 23, 24, NULL, 'POS walk-in sale', 5, '2026-03-20 14:05:49'),
(23, NULL, 5, 'out', 1.00, NULL, 24, 25, NULL, 'POS walk-in sale', 5, '2026-03-20 14:06:17'),
(24, NULL, 6, 'out', 1.00, NULL, 24, 26, NULL, 'POS walk-in sale', 5, '2026-03-20 14:06:17'),
(25, NULL, 5, 'out', 1.00, NULL, 27, 30, NULL, 'POS walk-in sale', 5, '2026-03-22 10:02:44'),
(26, NULL, 6, 'out', 1.00, NULL, 27, 31, NULL, 'POS walk-in sale', 5, '2026-03-22 10:02:44'),
(27, NULL, 9, 'out', 1.00, NULL, 27, 32, NULL, 'POS walk-in sale', 5, '2026-03-22 10:02:44'),
(28, NULL, 9, 'out', 2.00, NULL, 29, 35, NULL, 'POS walk-in sale', 5, '2026-03-23 14:11:48'),
(29, NULL, 9, 'out', 1.00, NULL, 30, 36, NULL, 'POS walk-in sale', 5, '2026-03-23 14:30:09'),
(33, NULL, 9, 'out', 1.00, NULL, 34, 40, NULL, 'POS walk-in sale', 5, '2026-03-23 14:41:04');

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `address` text DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `name`, `address`, `contact_number`, `email`, `created_at`, `updated_at`) VALUES
(1, '123', '123', '123', '123@gmail.com', '2026-03-21 15:00:13', '2026-03-21 15:00:13');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `pending_email` varchar(150) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','staff','customer') DEFAULT 'customer',
  `phone` varchar(20) DEFAULT NULL,
  `pending_phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `profile_photo` text DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `otp_code` varchar(10) DEFAULT NULL,
  `otp_expires` datetime DEFAULT NULL,
  `approval_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `pending_email`, `password`, `role`, `phone`, `pending_phone`, `address`, `profile_photo`, `is_verified`, `otp_code`, `otp_expires`, `approval_status`, `approved_by`, `approved_at`, `is_active`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'Administrator', 'admin@spiralwood.com', NULL, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaX.6IrqJXnq0RbbvO9rGDH9i', 'admin', NULL, NULL, NULL, NULL, 1, NULL, NULL, 'approved', NULL, NULL, 1, NULL, '2026-03-04 14:25:19', '2026-03-04 14:25:19'),
(2, 'Robin Nicolas', 'robinnicolas032@gmail.com', NULL, '$2a$12$nOzbbfn7HNKmkjCRPikLEePxckfvgPJ6UHpejZPrNyHPSJvjXleou', 'customer', '09766574817', NULL, 'PDM, Marilao, Bulacan', NULL, 1, NULL, NULL, 'pending', NULL, NULL, 1, NULL, '2026-03-09 11:11:58', '2026-03-09 11:12:20'),
(3, 'John Marc Aquino', 'jmaquino@gmail.com', NULL, '$2a$12$yhvBW8VoieXCf./eIV66LuZABGJL/6QJkX6bp8lt7XQycIlaUm7V6', 'customer', '09766574817', NULL, 'PDM, Marilao, Bulacan', NULL, 0, '643057', '2026-03-09 20:13:47', 'pending', NULL, NULL, 1, NULL, '2026-03-09 11:58:47', '2026-03-09 11:58:47'),
(4, 'John Marc Aquino', 'baluktottite7@gmail.com', NULL, '$2a$12$RwUTafjoROc5lNgwUxQX7.tI3BC5tyP9sbfYwVg.m.KoKg7a4VftK', 'customer', '09934391473', NULL, 'PDM, Marilao, Bulacan', NULL, 1, NULL, NULL, 'approved', NULL, NULL, 1, '2026-03-12 21:39:26', '2026-03-09 11:59:07', '2026-03-12 13:39:26'),
(5, 'Staff User', 'staff@gmail.com', NULL, '$2y$12$vg4yYX47in9fGBJn5OLbre7SjN7dEnIB2jFh1Fr1HWOFveVcYSTJO', 'staff', '09123456789', NULL, 'Sample Address', NULL, 1, NULL, NULL, 'approved', NULL, '2026-03-19 17:52:02', 1, '2026-03-24 17:29:39', '2026-03-19 09:52:02', '2026-03-24 09:29:39'),
(6, 'Admin 3', 'admin3@spiralwood.com', NULL, '$2y$12$XeynMMy8.vDVDtErjY4VZOZ9VRhwwQSrNFPCgSpRNptvW.asvFDW.', 'admin', NULL, NULL, NULL, NULL, 1, NULL, NULL, 'approved', NULL, NULL, 1, '2026-03-22 21:01:23', '2026-03-21 14:45:09', '2026-03-22 13:01:23'),
(7, 'Sample Customer', 'samplecustomer@gmail.com', NULL, '$2y$12$O8fiAQK3P2G6.rEA.w8wdeQNvI8S.FcfquReFzXga38VJ0zCMR1QO', 'customer', '09123456789', NULL, 'Sample Address', NULL, 1, NULL, NULL, 'approved', NULL, '2026-03-22 00:00:14', 1, '2026-03-24 17:29:16', '2026-03-21 15:42:26', '2026-03-24 09:29:16'),
(8, 'Jericho Flores', 'zanenatsuki@gmail.com', NULL, '$2a$12$VflPpz4KukDepxXCjh0bJep0FTOO0zO7WNG4YSnnnMRjCm/gpamIG', 'customer', '09530695320', NULL, 'Saog Marilao Bulacan', NULL, 0, '925787', '2026-03-21 23:59:16', 'pending', NULL, NULL, 1, NULL, '2026-03-21 15:44:16', '2026-03-21 15:44:16'),
(9, 'Jericho Flores', 'jerichoflores@gmail.com', NULL, '$2a$12$u4slMewEweGb5Uxn6Zw0oO7LwDH/4N2Kc3s.AEKd6RpH4TjEeheFu', 'customer', '0953065320', NULL, 'Saog Marilao', NULL, 0, '943851', '2026-03-22 00:12:59', 'rejected', 6, '2026-03-23 00:30:38', 1, NULL, '2026-03-21 15:57:59', '2026-03-22 16:30:38');

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `warranties`
--

CREATE TABLE `warranties` (
  `id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `order_item_id` int(11) DEFAULT NULL,
  `customer_id` int(11) NOT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `proof_url` text DEFAULT NULL,
  `warranty_expiry` date DEFAULT NULL,
  `status` enum('pending','approved','rejected','fulfilled') DEFAULT 'pending',
  `replacement_receipt` text DEFAULT NULL,
  `fulfilled_at` datetime DEFAULT NULL,
  `fulfilled_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `website_settings`
--

CREATE TABLE `website_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `value` text DEFAULT NULL,
  `group_name` varchar(50) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `website_settings`
--

INSERT INTO `website_settings` (`id`, `setting_key`, `value`, `group_name`, `updated_by`, `updated_at`) VALUES
(1, 'site_logo', '', 'display', NULL, '2026-03-04 14:25:19'),
(2, 'site_name', 'Spiral Wood Services', 'display', NULL, '2026-03-04 14:25:19'),
(3, 'show_faq_section', 'true', 'display', NULL, '2026-03-04 14:25:19'),
(4, 'show_about_section', 'true', 'display', NULL, '2026-03-04 14:25:19'),
(5, 'cod_enabled', 'true', 'payment', NULL, '2026-03-04 14:25:19'),
(6, 'cop_enabled', 'true', 'payment', NULL, '2026-03-04 14:25:19'),
(7, 'gcash_enabled', 'true', 'payment', NULL, '2026-03-04 14:25:19'),
(8, 'bank_transfer_enabled', 'true', 'payment', NULL, '2026-03-04 14:25:19'),
(9, 'gcash_number', '', 'payment', NULL, '2026-03-04 14:25:19'),
(10, 'bank_account_name', '', 'payment', NULL, '2026-03-04 14:25:19'),
(11, 'bank_account_number', '', 'payment', NULL, '2026-03-04 14:25:19'),
(12, 'email_footer', '', 'email', NULL, '2026-03-04 14:25:19'),
(13, 'checkout_note', '', 'email', NULL, '2026-03-04 14:25:19'),
(14, 'warranty_period_days', '365', 'policy', NULL, '2026-03-04 14:25:19'),
(15, 'cancellation_fee_pct', '15', 'policy', NULL, '2026-03-04 14:25:19');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `assigned_to` (`assigned_to`),
  ADD KEY `idx_appointments_customer` (`customer_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `backup_logs`
--
ALTER TABLE `backup_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `triggered_by` (`triggered_by`);

--
-- Indexes for table `bill_of_materials`
--
ALTER TABLE `bill_of_materials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `raw_material_id` (`raw_material_id`);

--
-- Indexes for table `blueprints`
--
ALTER TABLE `blueprints`
  ADD PRIMARY KEY (`id`),
  ADD KEY `creator_id` (`creator_id`),
  ADD KEY `client_id` (`client_id`),
  ADD KEY `assigned_staff_id` (`assigned_staff_id`);

--
-- Indexes for table `blueprint_components`
--
ALTER TABLE `blueprint_components`
  ADD PRIMARY KEY (`id`),
  ADD KEY `blueprint_id` (`blueprint_id`),
  ADD KEY `raw_material_id` (`raw_material_id`);

--
-- Indexes for table `blueprint_revisions`
--
ALTER TABLE `blueprint_revisions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `blueprint_id` (`blueprint_id`),
  ADD KEY `revised_by` (`revised_by`);

--
-- Indexes for table `cancellations`
--
ALTER TABLE `cancellations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_id` (`order_id`),
  ADD KEY `requested_by` (`requested_by`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `contracts`
--
ALTER TABLE `contracts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `authorized_by` (`authorized_by`);

--
-- Indexes for table `deliveries`
--
ALTER TABLE `deliveries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `driver_id` (`driver_id`);

--
-- Indexes for table `estimations`
--
ALTER TABLE `estimations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `blueprint_id` (`blueprint_id`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `estimation_items`
--
ALTER TABLE `estimation_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `estimation_id` (`estimation_id`),
  ADD KEY `component_id` (`component_id`),
  ADD KEY `raw_material_id` (`raw_material_id`);

--
-- Indexes for table `faqs`
--
ALTER TABLE `faqs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_number` (`order_number`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `blueprint_id` (`blueprint_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `variation_id` (`variation_id`);

--
-- Indexes for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `verified_by` (`verified_by`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `barcode` (`barcode`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `product_variations`
--
ALTER TABLE `product_variations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `raw_materials`
--
ALTER TABLE `raw_materials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `supplier_id` (`supplier_id`);

--
-- Indexes for table `receipts`
--
ALTER TABLE `receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_id` (`order_id`),
  ADD UNIQUE KEY `receipt_number` (`receipt_number`),
  ADD KEY `issued_by` (`issued_by`);

--
-- Indexes for table `static_pages`
--
ALTER TABLE `static_pages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `order_item_id` (`order_item_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `warranties`
--
ALTER TABLE `warranties`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `order_item_id` (`order_item_id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `fulfilled_by` (`fulfilled_by`);

--
-- Indexes for table `website_settings`
--
ALTER TABLE `website_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`),
  ADD KEY `updated_by` (`updated_by`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `appointments`
--
ALTER TABLE `appointments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `backup_logs`
--
ALTER TABLE `backup_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bill_of_materials`
--
ALTER TABLE `bill_of_materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `blueprints`
--
ALTER TABLE `blueprints`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `blueprint_components`
--
ALTER TABLE `blueprint_components`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `blueprint_revisions`
--
ALTER TABLE `blueprint_revisions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cancellations`
--
ALTER TABLE `cancellations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `contracts`
--
ALTER TABLE `contracts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `deliveries`
--
ALTER TABLE `deliveries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `estimations`
--
ALTER TABLE `estimations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `estimation_items`
--
ALTER TABLE `estimation_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `faqs`
--
ALTER TABLE `faqs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `password_resets`
--
ALTER TABLE `password_resets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `product_variations`
--
ALTER TABLE `product_variations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `raw_materials`
--
ALTER TABLE `raw_materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `receipts`
--
ALTER TABLE `receipts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `static_pages`
--
ALTER TABLE `static_pages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `stock_movements`
--
ALTER TABLE `stock_movements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `warranties`
--
ALTER TABLE `warranties`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `website_settings`
--
ALTER TABLE `website_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  ADD CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`);

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `backup_logs`
--
ALTER TABLE `backup_logs`
  ADD CONSTRAINT `backup_logs_ibfk_1` FOREIGN KEY (`triggered_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `bill_of_materials`
--
ALTER TABLE `bill_of_materials`
  ADD CONSTRAINT `bill_of_materials_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bill_of_materials_ibfk_2` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`id`);

--
-- Constraints for table `blueprints`
--
ALTER TABLE `blueprints`
  ADD CONSTRAINT `blueprints_ibfk_1` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `blueprints_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `blueprints_ibfk_3` FOREIGN KEY (`assigned_staff_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `blueprint_components`
--
ALTER TABLE `blueprint_components`
  ADD CONSTRAINT `blueprint_components_ibfk_1` FOREIGN KEY (`blueprint_id`) REFERENCES `blueprints` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `blueprint_components_ibfk_2` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`id`);

--
-- Constraints for table `blueprint_revisions`
--
ALTER TABLE `blueprint_revisions`
  ADD CONSTRAINT `blueprint_revisions_ibfk_1` FOREIGN KEY (`blueprint_id`) REFERENCES `blueprints` (`id`),
  ADD CONSTRAINT `blueprint_revisions_ibfk_2` FOREIGN KEY (`revised_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `cancellations`
--
ALTER TABLE `cancellations`
  ADD CONSTRAINT `cancellations_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  ADD CONSTRAINT `cancellations_ibfk_2` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `cancellations_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `contracts`
--
ALTER TABLE `contracts`
  ADD CONSTRAINT `contracts_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `contracts_ibfk_2` FOREIGN KEY (`authorized_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `deliveries`
--
ALTER TABLE `deliveries`
  ADD CONSTRAINT `deliveries_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  ADD CONSTRAINT `deliveries_ibfk_2` FOREIGN KEY (`driver_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `estimations`
--
ALTER TABLE `estimations`
  ADD CONSTRAINT `estimations_ibfk_1` FOREIGN KEY (`blueprint_id`) REFERENCES `blueprints` (`id`),
  ADD CONSTRAINT `estimations_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `estimation_items`
--
ALTER TABLE `estimation_items`
  ADD CONSTRAINT `estimation_items_ibfk_1` FOREIGN KEY (`estimation_id`) REFERENCES `estimations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `estimation_items_ibfk_2` FOREIGN KEY (`component_id`) REFERENCES `blueprint_components` (`id`),
  ADD CONSTRAINT `estimation_items_ibfk_3` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`id`);

--
-- Constraints for table `faqs`
--
ALTER TABLE `faqs`
  ADD CONSTRAINT `faqs_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`blueprint_id`) REFERENCES `blueprints` (`id`);

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `order_items_ibfk_3` FOREIGN KEY (`variation_id`) REFERENCES `product_variations` (`id`);

--
-- Constraints for table `password_resets`
--
ALTER TABLE `password_resets`
  ADD CONSTRAINT `password_resets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD CONSTRAINT `payment_transactions_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payment_transactions_ibfk_2` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

--
-- Constraints for table `product_variations`
--
ALTER TABLE `product_variations`
  ADD CONSTRAINT `product_variations_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `raw_materials`
--
ALTER TABLE `raw_materials`
  ADD CONSTRAINT `raw_materials_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `raw_materials_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`);

--
-- Constraints for table `receipts`
--
ALTER TABLE `receipts`
  ADD CONSTRAINT `receipts_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  ADD CONSTRAINT `receipts_ibfk_2` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `static_pages`
--
ALTER TABLE `static_pages`
  ADD CONSTRAINT `static_pages_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `stock_movements_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  ADD CONSTRAINT `stock_movements_ibfk_3` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`),
  ADD CONSTRAINT `stock_movements_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `warranties`
--
ALTER TABLE `warranties`
  ADD CONSTRAINT `warranties_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  ADD CONSTRAINT `warranties_ibfk_2` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`),
  ADD CONSTRAINT `warranties_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `warranties_ibfk_4` FOREIGN KEY (`fulfilled_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `website_settings`
--
ALTER TABLE `website_settings`
  ADD CONSTRAINT `website_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
