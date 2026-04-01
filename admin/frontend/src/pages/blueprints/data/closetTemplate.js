import { createAssemblyPart } from "./componentUtils";

const FLOOR_OFFSET = 40;
const SURFACE_EPS = 1;

export function createClosetWardrobeComponents(
  originX,
  originZ,
  canvasH,
  groupId,
  groupLabel,
) {
  const floorY = canvasH - FLOOR_OFFSET;

  // overall
  const w = 3200;
  const h = 2400;
  const d = 600;

  // IMPORTANT:
  // multiples of 20 para hindi sinisira ng snap() sa normalizeComponent
  const t = 20;
  const backT = 20;
  const shelfT = 20;
  const rodT = 20;

  // 4 bays — mas dikit sa reference image
  // total inner = 3100 (kasi 3200 - five 20mm vertical panels = 3100)
  const bay1W = 720;
  const bay2W = 620;
  const bay3W = 1020;
  const bay4W = 740;

  const innerX = originX + t;

  const bay1X = innerX;
  const div1X = bay1X + bay1W;

  const bay2X = div1X + t;
  const div2X = bay2X + bay2W;

  const bay3X = div2X + t;
  const div3X = bay3X + bay3W;

  const bay4X = div3X + t;

  const topY = floorY - h;

  // layout heights
  const topShelfY = topY + 200;
  const rodY = topShelfY + 80;

  const baseDeckY = floorY - 20;
  const baseDeckDepth = d;

  const shelfInsetX = 20;
  const shelfInsetZ = 20;
  const shelfDepth = d - shelfInsetZ * 2;

  // left bay
  const bay1LowerShelfY = floorY - 920;

  // second bay
  const bay2Shelf1Y = topY + 760;
  const bay2Shelf2Y = topY + 1160;

  const bay2DrawerCoverY = floorY - 900;
  const bay2DrawerFrontH = 300;
  const bay2DrawerGap = 20;
  const bay2Drawer1Y = bay2DrawerCoverY + shelfT + 20;
  const bay2Drawer2Y = bay2Drawer1Y + bay2DrawerFrontH + bay2DrawerGap;

  // third bay
  const bay3PedestalW = 300;
  const bay3DrawerFrontH = 180;
  const bay3DrawerY = floorY - 420;
  const bay3DrawerCoverY = bay3DrawerY - 40;

  const bay3SupportX = bay3X + bay3PedestalW - t;
  const bay3TableTopY = floorY - 980;
  const bay3TableX = bay3SupportX;
  const bay3TableW = bay3W - (bay3PedestalW - t);
  const bay3TableZ = originZ + 140;
  const bay3TableD = 440;

  const C = {
    carcass: "#8a5b38",
    divider: "#7a4d2d",
    shelf: "#b88456",
    innerShelf: "#c79463",
    drawerFront: "#d4a06d",
    drawerBox: "#6f472a",
    drawerBottom: "#8a5a36",
    backDark: "#8f613d",
    backMid: "#9d6d47",
    backLight: "#c59a72",
    metal: "#c9ced6",
  };

  const part = (data) =>
    createAssemblyPart({
      groupId,
      groupLabel,
      category: "Furniture Parts",
      blueprintStyle: "part",
      ...data,
    });

  const shelf = ({
    x,
    y,
    width,
    depth = shelfDepth,
    z = originZ + shelfInsetZ,
    label,
    partCode,
    fill = C.innerShelf,
    type = "wr_shelf",
  }) =>
    part({
      type,
      label,
      partCode,
      x,
      y,
      z,
      width,
      height: shelfT,
      depth,
      fill,
      material: "Laminated Board",
    });

  const vertical = ({
    x,
    y,
    z = originZ,
    width = t,
    height,
    depth = d,
    label,
    partCode,
    fill = C.divider,
    type = "wr_divider",
  }) =>
    part({
      type,
      label,
      partCode,
      x,
      y,
      z,
      width,
      height,
      depth,
      fill,
      material: "Laminated Board",
    });

  const backPanel = ({
    x,
    width,
    fill,
    label,
    partCode,
  }) =>
    part({
      type: "wr_back_panel",
      label,
      partCode,
      x,
      y: topY + 20,
      z: originZ,
      width,
      height: h - 20,
      depth: backT,
      fill,
      material: "Panel Board",
    });

  const rod = ({ x, width, suffix }) =>
    part({
      type: "wr_rod",
      label: `Hanging Rod ${suffix}`,
      partCode: `WR-R${suffix}`,
      x,
      y: rodY,
      z: originZ + 340,
      width,
      height: rodT,
      depth: rodT,
      fill: C.metal,
      material: "Metal",
    });

  const buildTopShelf = ({ x, width, suffix }) => [
    shelf({
      x: x + shelfInsetX,
      y: topShelfY,
      width: width - shelfInsetX * 2,
      depth: shelfDepth,
      label: `Top Shelf ${suffix}`,
      partCode: `WR-TS${suffix}`,
      fill: C.shelf,
      type: "wr_top_shelf",
    }),
  ];

  const buildBaseDeck = ({ x, width, suffix }) => [
    part({
      type: "wr_base_top",
      label: `Base Deck ${suffix}`,
      partCode: `WR-B${suffix}`,
      x,
      y: baseDeckY,
      z: originZ,
      width,
      height: 20,
      depth: baseDeckDepth,
      fill: C.shelf,
      material: "Laminated Board",
    }),
  ];

  const buildDrawerUnit = ({ x, y, frontW, frontH, suffix }) => {
    const frontZ = originZ + d - 20 + SURFACE_EPS;
    const bodyW = frontW - 40;
    const bodyH = Math.max(120, frontH - 100);
    const boxZ = originZ + 60;
    const bodyD = 400;
    const handleW = frontW > 360 ? 100 : 80;

    return [
      part({
        type: "wr_drawer_front",
        label: `Drawer Front ${suffix}`,
        partCode: `WR-DF${suffix}`,
        x,
        y,
        z: frontZ,
        width: frontW,
        height: frontH,
        depth: 20,
        fill: C.drawerFront,
        material: "Laminated Board",
      }),
      part({
        type: "wr_drawer_side",
        label: `Drawer Side L ${suffix}`,
        partCode: `WR-DSL${suffix}`,
        x: x + 20,
        y: y + 20,
        z: boxZ,
        width: 20,
        height: bodyH,
        depth: bodyD,
        fill: C.drawerBox,
        material: "Panel Board",
      }),
      part({
        type: "wr_drawer_side",
        label: `Drawer Side R ${suffix}`,
        partCode: `WR-DSR${suffix}`,
        x: x + frontW - 40,
        y: y + 20,
        z: boxZ,
        width: 20,
        height: bodyH,
        depth: bodyD,
        fill: C.drawerBox,
        material: "Panel Board",
      }),
      part({
        type: "wr_drawer_back",
        label: `Drawer Back ${suffix}`,
        partCode: `WR-DB${suffix}`,
        x: x + 40,
        y: y + 20,
        z: boxZ + bodyD - 20,
        width: bodyW - 20,
        height: bodyH,
        depth: 20,
        fill: C.drawerBox,
        material: "Panel Board",
      }),
      part({
        type: "wr_drawer_bottom",
        label: `Drawer Bottom ${suffix}`,
        partCode: `WR-DP${suffix}`,
        x: x + 20,
        y: y + 20 + bodyH - 20,
        z: boxZ + 20,
        width: bodyW,
        height: 20,
        depth: bodyD - 40,
        fill: C.drawerBottom,
        material: "Panel Board",
      }),
      part({
        type: "wr_drawer_handle",
        label: `Handle ${suffix}`,
        partCode: `WR-HDL${suffix}`,
        x: x + frontW / 2 - handleW / 2,
        y: y + frontH / 2 - 10,
        z: originZ + d + 20,
        width: handleW,
        height: 20,
        depth: 20,
        fill: C.metal,
        material: "Metal",
      }),
    ];
  };

  return [
    // outer sides
    part({
      type: "wr_side_panel",
      label: "Left Side",
      partCode: "WR-SPL",
      x: originX,
      y: topY,
      z: originZ,
      width: t,
      height: h,
      depth: d,
      fill: C.carcass,
      material: "Laminated Board",
    }),
    part({
      type: "wr_side_panel",
      label: "Right Side",
      partCode: "WR-SPR",
      x: originX + w - t,
      y: topY,
      z: originZ,
      width: t,
      height: h,
      depth: d,
      fill: C.carcass,
      material: "Laminated Board",
    }),

    // back panels per bay — para mas dikit sa reference
    backPanel({
      x: bay1X,
      width: bay1W,
      fill: C.backDark,
      label: "Back Panel 1",
      partCode: "WR-BK1",
    }),
    backPanel({
      x: bay2X,
      width: bay2W,
      fill: C.backMid,
      label: "Back Panel 2",
      partCode: "WR-BK2",
    }),
    backPanel({
      x: bay3X,
      width: bay3W,
      fill: C.backLight,
      label: "Back Panel 3",
      partCode: "WR-BK3",
    }),
    backPanel({
      x: bay4X,
      width: bay4W,
      fill: C.backMid,
      label: "Back Panel 4",
      partCode: "WR-BK4",
    }),

    // dividers
    vertical({
      x: div1X,
      y: topY,
      height: h,
      label: "Divider 1",
      partCode: "WR-D1",
    }),
    vertical({
      x: div2X,
      y: topY,
      height: h,
      label: "Divider 2",
      partCode: "WR-D2",
    }),
    vertical({
      x: div3X,
      y: topY,
      height: h,
      label: "Divider 3",
      partCode: "WR-D3",
    }),

    // top shelves
    ...buildTopShelf({ x: bay1X, width: bay1W, suffix: "1" }),
    ...buildTopShelf({ x: bay2X, width: bay2W, suffix: "2" }),
    ...buildTopShelf({ x: bay3X, width: bay3W, suffix: "3" }),
    ...buildTopShelf({ x: bay4X, width: bay4W, suffix: "4" }),

    // base decks
    ...buildBaseDeck({ x: bay1X, width: bay1W, suffix: "1" }),
    ...buildBaseDeck({ x: bay2X, width: bay2W, suffix: "2" }),
    ...buildBaseDeck({ x: bay3X, width: bay3W, suffix: "3" }),
    ...buildBaseDeck({ x: bay4X, width: bay4W, suffix: "4" }),

    // rods
    rod({ x: bay1X + 40, width: bay1W - 80, suffix: "1" }),
    rod({ x: bay3X + 60, width: bay3W - 120, suffix: "3" }),
    rod({ x: bay4X + 40, width: bay4W - 80, suffix: "4" }),

    // bay 1
    shelf({
      x: bay1X + shelfInsetX,
      y: bay1LowerShelfY,
      width: bay1W - shelfInsetX * 2,
      label: "Bay 1 Lower Shelf",
      partCode: "WR-B1-S1",
      fill: C.shelf,
    }),

    // bay 2
    shelf({
      x: bay2X + shelfInsetX,
      y: bay2Shelf1Y,
      width: bay2W - shelfInsetX * 2,
      label: "Bay 2 Shelf 1",
      partCode: "WR-B2-S1",
    }),
    shelf({
      x: bay2X + shelfInsetX,
      y: bay2Shelf2Y,
      width: bay2W - shelfInsetX * 2,
      label: "Bay 2 Shelf 2",
      partCode: "WR-B2-S2",
    }),
    shelf({
      x: bay2X + 20,
      y: bay2DrawerCoverY,
      width: bay2W - 40,
      label: "Bay 2 Drawer Cover",
      partCode: "WR-B2-CV",
      fill: C.shelf,
    }),
    ...buildDrawerUnit({
      x: bay2X + 20,
      y: bay2Drawer1Y,
      frontW: bay2W - 40,
      frontH: bay2DrawerFrontH,
      suffix: "1",
    }),
    ...buildDrawerUnit({
      x: bay2X + 20,
      y: bay2Drawer2Y,
      frontW: bay2W - 40,
      frontH: bay2DrawerFrontH,
      suffix: "2",
    }),

    // bay 3 - low drawer + side table
    shelf({
      x: bay3X + 20,
      y: bay3DrawerCoverY,
      width: bay3PedestalW - 40,
      label: "Bay 3 Drawer Cover",
      partCode: "WR-B3-CV",
      fill: C.shelf,
    }),
    ...buildDrawerUnit({
      x: bay3X + 20,
      y: bay3DrawerY,
      frontW: bay3PedestalW - 40,
      frontH: bay3DrawerFrontH,
      suffix: "3",
    }),
    vertical({
      x: bay3SupportX,
      y: bay3TableTopY + shelfT,
      z: bay3TableZ,
      height: baseDeckY - (bay3TableTopY + shelfT),
      depth: bay3TableD,
      label: "Bay 3 Table Support",
      partCode: "WR-B3-SP",
      fill: C.divider,
      type: "wr_support_panel",
    }),
    shelf({
      x: bay3TableX,
      y: bay3TableTopY,
      z: bay3TableZ,
      width: bay3TableW,
      depth: bay3TableD,
      label: "Bay 3 Side Table",
      partCode: "WR-B3-TBL",
      fill: C.shelf,
      type: "wr_table",
    }),
  ];
}