// data/closetTemplate.js — Closet / Wardrobe cabinet assembly template
// Based on: Sample_Mats_of_Products.docx — Closet / Wardrobe spec
//
// Overall cabinet: 900 W × 2400 H × 600 D mm
// Parts:
//   Cabinet Frame (Carcass) — 2 Side Panels, Top, Bottom, Back Panel
//   Drawer                  — Front, 2 Sides, Back, Bottom
//   Shelf                   — 1 Shelf Board
//   Vertical Divider Panel  — 1 Divider
//   Hanging Rod Assembly    — Rod + 2 Brackets

import { createAssemblyPart } from "./componentUtils";

const FLOOR_OFFSET = 40;
const BOARD = 18; // standard board thickness mm

/**
 * createClosetWardrobeComponents
 *
 * @param {number} originX  - X position of cabinet left edge in world space
 * @param {number} originZ  - Z position of cabinet front edge in world space
 * @param {number} canvasH  - world height (used to compute floor Y)
 * @param {string} groupId  - shared group ID for all parts
 * @param {string} groupLabel - label shown in UI (e.g. "Closet Wardrobe 1")
 * @returns {Array} array of normalized component objects
 */
export function createClosetWardrobeComponents(
  originX,
  originZ,
  canvasH,
  groupId,
  groupLabel,
) {
  const floorY = canvasH - FLOOR_OFFSET;
  const t = BOARD; // 18 mm board thickness

  // ── Cabinet overall dimensions ─────────────────────────────────────────────
  const W = 900; // overall width
  const H = 2400; // overall height
  const D = 600; // overall depth

  // ── Derived positions ──────────────────────────────────────────────────────
  const cabinetTop = floorY - H;
  const innerW = W - t * 2; // inner width between side panels
  const innerD = D - t; // inner depth (back panel is 6mm, not t)

  // ── Divider splits cabinet into: left hanging zone (55%) + right drawer/shelf zone (45%)
  const dividerX = originX + t + Math.round(innerW * 0.55);
  const rightZoneW = originX + W - t - dividerX; // width of right zone

  // ── Hanging rod sits in left zone at ~72% height
  const rodY = cabinetTop + Math.round(H * 0.28);

  // ── Shelf is in right zone at ~55% height
  const shelfY = cabinetTop + Math.round(H * 0.55);

  // ── Drawer is at bottom of right zone (200mm tall)
  const drawerH = 200;
  const drawerFrontY = floorY - t - drawerH; // sits just above bottom panel

  const base = {
    groupId,
    groupLabel,
    groupType: "assembly",
    category: "Cabinet Parts",
    blueprintStyle: "casework",
  };

  return [
    // ═══════════════════════════════════════════════════════════════════════
    // CABINET FRAME (CARCASS)
    // ═══════════════════════════════════════════════════════════════════════

    // Left Side Panel — 2400 × 600 × 18 mm — Laminated plywood / MDF
    createAssemblyPart({
      ...base,
      type: "closet_side_panel",
      label: "Left Side Panel",
      partCode: "CSL",
      x: originX,
      y: cabinetTop,
      z: originZ,
      width: t,
      height: H,
      depth: D,
      material: "Laminated plywood / MDF",
      fill: "#d2b48c",
      unitPrice: 3200,
    }),

    // Right Side Panel — 2400 × 600 × 18 mm — Laminated plywood / MDF
    createAssemblyPart({
      ...base,
      type: "closet_side_panel",
      label: "Right Side Panel",
      partCode: "CSR",
      x: originX + W - t,
      y: cabinetTop,
      z: originZ,
      width: t,
      height: H,
      depth: D,
      material: "Laminated plywood / MDF",
      fill: "#d2b48c",
      unitPrice: 3200,
    }),

    // Top Panel — 900 × 600 × 18 mm — Laminated plywood
    createAssemblyPart({
      ...base,
      type: "closet_top_panel",
      label: "Top Panel",
      partCode: "CTP",
      x: originX,
      y: cabinetTop,
      z: originZ,
      width: W,
      height: t,
      depth: D,
      material: "Laminated plywood",
      fill: "#c8a87a",
      unitPrice: 1800,
    }),

    // Bottom Panel — 900 × 600 × 18 mm — Laminated plywood
    createAssemblyPart({
      ...base,
      type: "closet_bottom_panel",
      label: "Bottom Panel",
      partCode: "CBP",
      x: originX,
      y: floorY - t,
      z: originZ,
      width: W,
      height: t,
      depth: D,
      material: "Laminated plywood",
      fill: "#c8a87a",
      unitPrice: 1800,
    }),

    // Back Panel — 2400 × 900 × 18 mm — Plywood (shown as 6mm thin)
    createAssemblyPart({
      ...base,
      type: "closet_back_panel",
      label: "Back Panel",
      partCode: "CBKP",
      x: originX,
      y: cabinetTop,
      z: originZ,
      width: W,
      height: H,
      depth: 6,
      material: "Plywood",
      fill: "#b89a6e",
      unitPrice: 2400,
    }),

    // ═══════════════════════════════════════════════════════════════════════
    // VERTICAL DIVIDER PANEL — 2400 × 550 × 18 mm — Laminated plywood / MDF
    // ═══════════════════════════════════════════════════════════════════════
    createAssemblyPart({
      ...base,
      type: "closet_divider",
      label: "Vertical Divider Panel",
      partCode: "CVD",
      x: dividerX,
      y: cabinetTop + t, // sits between top and bottom panels
      z: originZ + t,
      width: t,
      height: H - t * 2,
      depth: D - t - 6, // leaves 6mm gap at back
      material: "Laminated plywood / MDF",
      fill: "#c4a06a",
      unitPrice: 2800,
    }),

    // ═══════════════════════════════════════════════════════════════════════
    // SHELF — 900 × 550 × 18 mm — Laminated plywood / MDF
    // (placed in right zone)
    // ═══════════════════════════════════════════════════════════════════════
    createAssemblyPart({
      ...base,
      type: "closet_shelf",
      label: "Shelf Board",
      partCode: "CSH",
      x: dividerX + t,
      y: shelfY,
      z: originZ + t,
      width: rightZoneW,
      height: t,
      depth: D - t - 6,
      material: "Laminated plywood / MDF",
      fill: "#c8a87a",
      unitPrice: 1500,
    }),

    // ═══════════════════════════════════════════════════════════════════════
    // HANGING ROD ASSEMBLY
    // Rod: 900 mm length — Stainless steel / Aluminum
    // ═══════════════════════════════════════════════════════════════════════

    // Hanging Rod (in left zone)
    createAssemblyPart({
      ...base,
      type: "closet_rod",
      label: "Hanging Rod",
      partCode: "CHR",
      x: originX + t + 30, // 30mm from left side panel
      y: rodY,
      z: originZ + D * 0.35, // centered front-to-back
      width: dividerX - originX - t - 30,
      height: 25,
      depth: 25,
      material: "Stainless steel / Aluminum",
      fill: "#94a3b8",
      unitPrice: 800,
    }),

    // Rod Bracket Left
    createAssemblyPart({
      ...base,
      type: "closet_rod_bracket",
      label: "Rod Bracket L",
      partCode: "CHRBL",
      x: originX + t + 10,
      y: rodY - 20,
      z: originZ + D * 0.35,
      width: 20,
      height: 40,
      depth: 20,
      material: "Steel",
      fill: "#64748b",
      unitPrice: 200,
    }),

    // Rod Bracket Right
    createAssemblyPart({
      ...base,
      type: "closet_rod_bracket",
      label: "Rod Bracket R",
      partCode: "CHRBR",
      x: dividerX - 30,
      y: rodY - 20,
      z: originZ + D * 0.35,
      width: 20,
      height: 40,
      depth: 20,
      material: "Steel",
      fill: "#64748b",
      unitPrice: 200,
    }),

    // ═══════════════════════════════════════════════════════════════════════
    // DRAWER (in right zone, at bottom)
    // ═══════════════════════════════════════════════════════════════════════

    // Drawer Front Panel — 450 × 200 × 18 mm — MDF
    createAssemblyPart({
      ...base,
      type: "closet_drawer_front",
      label: "Drawer Front Panel",
      partCode: "CDF",
      x: dividerX + t,
      y: drawerFrontY,
      z: originZ, // flush with cabinet front
      width: 450,
      height: drawerH,
      depth: t,
      material: "MDF",
      fill: "#dac8b0",
      unitPrice: 1200,
    }),

    // Drawer Side Panel L — 450 × 120 × 12 mm — Plywood
    createAssemblyPart({
      ...base,
      type: "closet_drawer_side",
      label: "Drawer Side L",
      partCode: "CDSL",
      x: dividerX + t,
      y: drawerFrontY + (drawerH - 120) / 2,
      z: originZ + t,
      width: 12,
      height: 120,
      depth: 450,
      material: "Plywood",
      fill: "#c4a882",
      unitPrice: 600,
    }),

    // Drawer Side Panel R — 450 × 120 × 12 mm — Plywood
    createAssemblyPart({
      ...base,
      type: "closet_drawer_side",
      label: "Drawer Side R",
      partCode: "CDSR",
      x: dividerX + t + 450 - 12,
      y: drawerFrontY + (drawerH - 120) / 2,
      z: originZ + t,
      width: 12,
      height: 120,
      depth: 450,
      material: "Plywood",
      fill: "#c4a882",
      unitPrice: 600,
    }),

    // Drawer Back Panel — 350 × 120 × 12 mm — Plywood
    createAssemblyPart({
      ...base,
      type: "closet_drawer_back",
      label: "Drawer Back Panel",
      partCode: "CDBK",
      x: dividerX + t + 12,
      y: drawerFrontY + (drawerH - 120) / 2,
      z: originZ + t + 450 - 12,
      width: 350,
      height: 120,
      depth: 12,
      material: "Plywood",
      fill: "#c4a882",
      unitPrice: 500,
    }),

    // Drawer Bottom Panel — 450 × 350 × 6 mm — Plywood
    createAssemblyPart({
      ...base,
      type: "closet_drawer_bottom",
      label: "Drawer Bottom Panel",
      partCode: "CDBT",
      x: dividerX + t + 12,
      y: drawerFrontY + drawerH - 6,
      z: originZ + t,
      width: 350,
      height: 6,
      depth: 450,
      material: "Plywood",
      fill: "#b89a6e",
      unitPrice: 400,
    }),
  ];
}
