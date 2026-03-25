// data/componentUtils.js — Component utility and normalization functions
import { normalizeCornerRadius } from "../shapes/roundedBox";
import {
  WOOD_FINISH_MAP,
  WOOD_FINISHES,
  CHAIR_PART_SET,
  VIEWS,
} from "./furnitureTypes";
import { snap, makeId } from "./utils";

const GRID_SIZE = 20;

function isChairPartType(type) {
  return CHAIR_PART_SET.has(type);
}

function getViewSheetCode(view) {
  return VIEWS.find((v) => v.key === view)?.sheet || "A-101";
}

function getWoodFinish(finishId = "") {
  return WOOD_FINISH_MAP[finishId] || WOOD_FINISHES[0];
}

function isWoodLikeMaterial(material = "") {
  return /wood|oak|teak|walnut|mahogany|pine|maple|beech|ash|veneer|plywood|marine/i.test(
    String(material),
  );
}

function getDefaultFinishId(material = "") {
  if (!isWoodLikeMaterial(material)) return "";

  if (/walnut/i.test(material)) return "walnut-dark";
  if (/mahogany/i.test(material)) return "mahogany-rich";
  if (/teak/i.test(material)) return "teak-golden";
  if (/pine/i.test(material)) return "pine-light";
  if (/maple/i.test(material)) return "maple-cream";
  if (/beech/i.test(material)) return "beech-honey";
  if (/ash/i.test(material)) return "ash-beige";

  return "oak-natural";
}

function applyWoodFinish(comp = {}, finishId = "") {
  if (!finishId) {
    return {
      finish: "",
      fill: comp.fill,
      material: comp.material,
    };
  }

  const finish = getWoodFinish(finishId);

  return {
    finish: finish.id,
    fill: finish.front,
    material: finish.material,
  };
}

function normalizeComponent(c) {
  const rawMaterial = c.material || "Marine Plywood";
  const hasExplicitFinish = Object.prototype.hasOwnProperty.call(c, "finish");
  const resolvedFinishId = hasExplicitFinish
    ? c.finish || ""
    : getDefaultFinishId(rawMaterial);
  const finish = resolvedFinishId ? getWoodFinish(resolvedFinishId) : null;

  return {
    id: c.id || makeId(),
    groupId: c.groupId || null,
    groupLabel: c.groupLabel || "",
    groupType: c.groupType || null,
    partCode: c.partCode || "",
    category: c.category || "Custom",
    blueprintStyle: c.blueprintStyle || "box",
    type: c.type || "custom_component",
    label: c.label || "Component",
    x: snap(Number(c.x) || 0),
    y: snap(Number(c.y) || 0),
    z: snap(Number(c.z) || 0),
    width: Math.max(GRID_SIZE, snap(Number(c.width) || 120)),
    height: Math.max(GRID_SIZE, snap(Number(c.height) || 80)),
    depth: Math.max(GRID_SIZE, snap(Number(c.depth) || 60)),
    rotationX: Math.round(Number(c.rotationX) || 0),
    rotationY: Math.round(Number(c.rotationY) || 0),
    rotationZ: Math.round(Number(c.rotationZ) || 0),
    fill: resolvedFinishId
      ? finish?.front || c.fill || "#d9c2a5"
      : c.fill || "#d9c2a5",
    material: resolvedFinishId
      ? finish?.material || c.material || "Marine Plywood"
      : c.material || "Marine Plywood",
    finish: resolvedFinishId,
    unitPrice: Number(c.unitPrice) || 0,
    qty: Math.max(1, Number(c.qty) || 1),
    locked: !!c.locked,
    cornerRadius: normalizeCornerRadius(c.cornerRadius),
    topRatio: Math.max(0.05, Math.min(0.98, Number(c.topRatio) || 0.5)),
  };
}

function getProjectedBox(comp, view) {
  if (view === "front" || view === "back") {
    return { x: comp.x, y: comp.y, w: comp.width, h: comp.height };
  }
  if (view === "left" || view === "right") {
    return { x: comp.z, y: comp.y, w: comp.depth, h: comp.height };
  }
  if (view === "top") {
    return { x: comp.x, y: comp.z, w: comp.width, h: comp.depth };
  }
  return null;
}

function getComponentsBounds3D(components) {
  if (!components.length) return null;

  const minX = Math.min(...components.map((c) => c.x));
  const minY = Math.min(...components.map((c) => c.y));
  const minZ = Math.min(...components.map((c) => c.z));
  const maxX = Math.max(...components.map((c) => c.x + c.width));
  const maxY = Math.max(...components.map((c) => c.y + c.height));
  const maxZ = Math.max(...components.map((c) => c.z + c.depth));

  return {
    minX,
    minY,
    minZ,
    maxX,
    maxY,
    maxZ,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
  };
}

function get2DBounds(items) {
  if (!items.length) return null;

  const minX = Math.min(...items.map((i) => i.box.x));
  const minY = Math.min(...items.map((i) => i.box.y));
  const maxX = Math.max(...items.map((i) => i.box.x + i.box.w));
  const maxY = Math.max(...items.map((i) => i.box.y + i.box.h));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getSelectionGroup(components, selectedComp) {
  if (!selectedComp) return [];
  if (selectedComp.groupId)
    return components.filter((c) => c.groupId === selectedComp.groupId);
  return [selectedComp];
}

function shouldMirrorView(view) {
  return view === "back" || view === "right";
}

function getMirroredBox(box, bounds, view) {
  if (!shouldMirrorView(view) || !bounds) return box;
  return {
    ...box,
    x: bounds.minX + bounds.width - (box.x - bounds.minX) - box.w,
  };
}

function getNextChairOrigin(components) {
  const chairGroups = [
    ...new Set(
      components.filter((c) => c.groupType === "chair").map((c) => c.groupId),
    ),
  ];

  if (!chairGroups.length) return { x: 80, z: 80 };

  let maxX = 80;
  chairGroups.forEach((gid) => {
    const parts = components.filter((c) => c.groupId === gid);
    const bounds = getComponentsBounds3D(parts);
    if (bounds) maxX = Math.max(maxX, bounds.maxX + 220);
  });

  return { x: maxX, z: 80 };
}

function getChairGroupOrigin(groupComponents) {
  const seat = groupComponents.find((c) => c.type === "chair_seat_panel");
  if (seat) return { x: seat.x, z: seat.z - 20 };

  const bounds = getComponentsBounds3D(groupComponents);
  if (bounds) return { x: bounds.minX, z: bounds.minZ };

  return { x: 80, z: 80 };
}

function createChairPart(overrides) {
  const baseMaterial = overrides.material || "Oak Wood";
  const finishId = overrides.finish || getDefaultFinishId(baseMaterial);
  const finishData = finishId
    ? applyWoodFinish({ material: baseMaterial }, finishId)
    : {};

  return normalizeComponent({
    fill: finishData.fill || "#d9c2a5",
    material: finishData.material || baseMaterial,
    finish: finishData.finish || "",
    qty: 1,
    locked: false,
    category: "Chair Parts",
    blueprintStyle: "chair_part",
    ...overrides,
  });
}

function createAssemblyPart(overrides) {
  const baseMaterial = overrides.material || "Oak Wood";
  const finishId = overrides.finish || getDefaultFinishId(baseMaterial);
  const finishData = finishId
    ? applyWoodFinish({ material: baseMaterial }, finishId)
    : {};

  return normalizeComponent({
    fill: finishData.fill || overrides.fill || "#d9c2a5",
    material: finishData.material || baseMaterial,
    finish: finishData.finish || "",
    qty: 1,
    locked: false,
    category: "Furniture Parts",
    blueprintStyle: "part",
    groupType: "assembly",
    ...overrides,
  });
}

function getNextAssemblyOrigin(components) {
  const bounds = getComponentsBounds3D(components);
  if (!bounds) return { x: 200, z: 160 };

  return {
    x: snap(bounds.maxX + 260),
    z: 160,
  };
}

export {
  isChairPartType,
  getViewSheetCode,
  getWoodFinish,
  isWoodLikeMaterial,
  getDefaultFinishId,
  applyWoodFinish,
  normalizeComponent,
  getProjectedBox,
  getComponentsBounds3D,
  get2DBounds,
  getSelectionGroup,
  shouldMirrorView,
  getMirroredBox,
  getNextChairOrigin,
  getChairGroupOrigin,
  createChairPart,
  createAssemblyPart,
  getNextAssemblyOrigin,
};
