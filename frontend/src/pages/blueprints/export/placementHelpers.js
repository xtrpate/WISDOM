// export/placementHelpers.js — Placement, exploded view, and export scaling helpers
import {
  getComponentsBounds3D,
  get2DBounds,
  getProjectedBox,
  shouldMirrorView,
  getMirroredBox,
  getChairGroupOrigin,
  getNextChairOrigin,
  isChairPartType,
} from "../data/componentUtils";
import { CHAIR_PART_SET } from "../data/furnitureTypes";

const GRID_SIZE = 20;
const FLOOR_OFFSET = 40;
const EXPORT_PAGE_W = 1200;
const EXPORT_PAGE_H = 820;
const DRAWING_PADDING = 56;
const TITLE_BLOCK_H = 96;
const PAPER_MARGIN = 28;

function getChairManualPlacement(
  typeDef,
  existingGroupComponents,
  allComponents,
  canvasH,
) {
  const floorY = canvasH - FLOOR_OFFSET;
  const seatTop = floorY - 450;

  const origin = existingGroupComponents.length
    ? getChairGroupOrigin(existingGroupComponents)
    : getNextChairOrigin(allComponents);

  const sameType = existingGroupComponents.filter(
    (c) => c.type === typeDef.type,
  );
  const count = sameType.length;

  switch (typeDef.type) {
    case "chair_seat_panel":
      return {
        label: "Seat Panel",
        partCode: "SP",
        x: origin.x,
        y: seatTop,
        z: origin.z + 20,
        width: 420,
        height: 20,
        depth: 420,
      };

    case "chair_front_leg":
      return {
        label:
          count === 0
            ? "Front Leg L"
            : count === 1
              ? "Front Leg R"
              : `Front Leg ${count + 1}`,
        partCode: count === 0 ? "FL" : count === 1 ? "FR" : `FL${count + 1}`,
        x: origin.x + (count % 2 === 0 ? 0 : 385) + Math.max(0, count - 1) * 25,
        y: floorY - 430,
        z: origin.z + 20,
        width: 35,
        height: 430,
        depth: 35,
      };

    case "chair_back_leg":
      return {
        label:
          count === 0
            ? "Back Leg L"
            : count === 1
              ? "Back Leg R"
              : `Back Leg ${count + 1}`,
        partCode: count === 0 ? "BL" : count === 1 ? "BR" : `BL${count + 1}`,
        x: origin.x + (count % 2 === 0 ? 0 : 385) + Math.max(0, count - 1) * 25,
        y: floorY - 920,
        z: origin.z + 405,
        width: 35,
        height: 920,
        depth: 35,
      };

    case "chair_front_rail":
      return {
        label: count === 0 ? "Front Rail" : `Front Rail ${count + 1}`,
        partCode: count === 0 ? "FRT" : `FRT${count + 1}`,
        x: origin.x + 35,
        y: seatTop + 28 + count * 24,
        z: origin.z + 35,
        width: 350,
        height: 20,
        depth: 20,
      };

    case "chair_rear_rail":
      return {
        label: count === 0 ? "Rear Rail" : `Rear Rail ${count + 1}`,
        partCode: count === 0 ? "RRT" : `RRT${count + 1}`,
        x: origin.x + 35,
        y: seatTop + 28 + count * 24,
        z: origin.z + 400,
        width: 350,
        height: 20,
        depth: 20,
      };

    case "chair_side_rail":
      return {
        label:
          count === 0
            ? "Side Rail L"
            : count === 1
              ? "Side Rail R"
              : `Side Rail ${count + 1}`,
        partCode: count === 0 ? "SRL" : count === 1 ? "SRR" : `SR${count + 1}`,
        x: origin.x + (count % 2 === 0 ? 8 : 392),
        y: seatTop + 28,
        z: origin.z + 55 + Math.max(0, count - 1) * 18,
        width: 20,
        height: 20,
        depth: 310,
      };

    case "chair_back_slat":
      return {
        label: `Back Slat ${count + 1}`,
        partCode: `BS${count + 1}`,
        x: origin.x + 50,
        y: seatTop - 120 - count * 72,
        z: origin.z + 405,
        width: 320,
        height: 18,
        depth: 20,
      };

    default:
      return {
        label: typeDef.label,
        partCode: "",
        x: origin.x,
        y: floorY - typeDef.h,
        z: origin.z,
        width: typeDef.w,
        height: typeDef.h,
        depth: typeDef.d,
      };
  }
}

function getChairExplodedBox(comp, groupComponents) {
  const slatIndex = groupComponents
    .filter((c) => c.type === "chair_back_slat")
    .sort((a, b) => a.y - b.y)
    .findIndex((c) => c.id === comp.id);

  const frontLegIndex = groupComponents
    .filter((c) => c.type === "chair_front_leg")
    .sort((a, b) => a.x - b.x)
    .findIndex((c) => c.id === comp.id);

  const backLegIndex = groupComponents
    .filter((c) => c.type === "chair_back_leg")
    .sort((a, b) => a.x - b.x)
    .findIndex((c) => c.id === comp.id);

  const sideRailIndex = groupComponents
    .filter((c) => c.type === "chair_side_rail")
    .sort((a, b) => a.x - b.x)
    .findIndex((c) => c.id === comp.id);

  switch (comp.type) {
    case "chair_back_slat":
      return {
        x: 260,
        y: 50 + Math.max(0, slatIndex) * 58,
        w: comp.width,
        h: Math.max(22, comp.height * 2),
      };

    case "chair_back_leg":
      return {
        x: backLegIndex <= 0 ? 95 : 620,
        y: 120,
        w: 42,
        h: Math.max(260, comp.height * 0.72),
      };

    case "chair_seat_panel":
      return {
        x: 235,
        y: 340,
        w: comp.width * 0.82,
        h: Math.max(42, comp.depth * 0.22),
      };

    case "chair_front_leg":
      return {
        x: frontLegIndex <= 0 ? 155 : 570,
        y: 450,
        w: 40,
        h: Math.max(190, comp.height * 0.65),
      };

    case "chair_front_rail":
      return {
        x: 260,
        y: 455,
        w: comp.width * 0.75,
        h: Math.max(20, comp.height * 1.3),
      };

    case "chair_rear_rail":
      return {
        x: 260,
        y: 505,
        w: comp.width * 0.75,
        h: Math.max(20, comp.height * 1.3),
      };

    case "chair_side_rail":
      return {
        x: sideRailIndex <= 0 ? 190 : 615,
        y: 372,
        w: 28,
        h: Math.max(130, comp.depth * 0.72),
      };

    default:
      return {
        x: comp.x,
        y: comp.y,
        w: comp.width,
        h: comp.height,
      };
  }
}

function getGenericExplodedBox(comp, index) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: 80 + col * 270,
    y: 70 + row * 190,
    w: Math.max(90, Math.min(240, comp.width * 0.18)),
    h: Math.max(70, Math.min(150, comp.height * 0.18)),
  };
}

function getExplodedBox(comp, groupComponents, index) {
  const isChairGroup = groupComponents.some(
    (c) => c.groupType === "chair" || isChairPartType(c.type),
  );
  return isChairGroup
    ? getChairExplodedBox(comp, groupComponents)
    : getGenericExplodedBox(comp, index);
}

function getExportDrawingArea(pageW = EXPORT_PAGE_W, pageH = EXPORT_PAGE_H) {
  return {
    x: PAPER_MARGIN + DRAWING_PADDING,
    y: PAPER_MARGIN + DRAWING_PADDING,
    w: pageW - PAPER_MARGIN * 2 - DRAWING_PADDING * 2,
    h: pageH - PAPER_MARGIN * 2 - TITLE_BLOCK_H - DRAWING_PADDING * 1.45,
  };
}

function getExportRawItems(selectedComponents, view) {
  if (!selectedComponents.length) return [];

  if (view === "exploded") {
    return selectedComponents.map((comp, index) => ({
      comp,
      box: getExplodedBox(comp, selectedComponents, index),
    }));
  }

  const projected = selectedComponents
    .map((comp) => {
      const box = getProjectedBox(comp, view);
      if (!box) return null;
      return { comp, box };
    })
    .filter(Boolean);

  const bounds = get2DBounds(projected);

  return projected.map((item) => ({
    ...item,
    box: getMirroredBox(item.box, bounds, view),
  }));
}

function getScaledExportItems(
  selectedComponents,
  view,
  pageW = EXPORT_PAGE_W,
  pageH = EXPORT_PAGE_H,
) {
  const drawingArea = getExportDrawingArea(pageW, pageH);
  const rawItems = getExportRawItems(selectedComponents, view);
  const bounds2D = get2DBounds(rawItems);

  if (!bounds2D) {
    return {
      drawingArea,
      rawItems: [],
      scaledItems: [],
      bounds2D: null,
      overallScreenBounds: null,
    };
  }

  const scale = Math.min(
    drawingArea.w / Math.max(bounds2D.width, 1),
    drawingArea.h / Math.max(bounds2D.height, 1),
    view === "exploded" ? 0.96 : 1.1,
  );

  const offsetX = drawingArea.x + (drawingArea.w - bounds2D.width * scale) / 2;
  const offsetY = drawingArea.y + (drawingArea.h - bounds2D.height * scale) / 2;

  const scaledItems = rawItems.map((item) => ({
    ...item,
    screenBox: {
      x: offsetX + (item.box.x - bounds2D.minX) * scale,
      y: offsetY + (item.box.y - bounds2D.minY) * scale,
      w: Math.max(8, item.box.w * scale),
      h: Math.max(8, item.box.h * scale),
    },
  }));

  const overallScreenBounds = scaledItems.length
    ? {
        minX: Math.min(...scaledItems.map((i) => i.screenBox.x)),
        minY: Math.min(...scaledItems.map((i) => i.screenBox.y)),
        maxX: Math.max(
          ...scaledItems.map((i) => i.screenBox.x + i.screenBox.w),
        ),
        maxY: Math.max(
          ...scaledItems.map((i) => i.screenBox.y + i.screenBox.h),
        ),
      }
    : null;

  return {
    drawingArea,
    rawItems,
    scaledItems,
    bounds2D,
    overallScreenBounds,
  };
}

export {
  getChairManualPlacement,
  getChairExplodedBox,
  getGenericExplodedBox,
  getExplodedBox,
  getExportDrawingArea,
  getExportRawItems,
  getScaledExportItems,
};
