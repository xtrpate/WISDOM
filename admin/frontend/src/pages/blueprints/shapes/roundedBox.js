import * as THREE from "three";

// ── Library item ─────────────────────────────────────────────────────────────
export const BOX_FACE_KEYS = ["top", "bottom", "front", "back", "left", "right"];

export const ROUNDED_BOX_TYPES = [
  {
    label: "Rounded Corner Box",
    type: "rounded_box",
    category: "Custom Shapes",
    w: 600,
    h: 400,
    d: 400,
    fill: "#d9c2a5",
    material: "Oak Wood",
    unitPrice: 0,
    blueprintStyle: "box",
    cornerRadius: 40,

    // shell
    isHollow: false,
    wallThickness: 20,
    bottomThickness: 20,

    // face selection / open
    selectedFace: "top",
    faceOpenTop: false,
    faceOpenBottom: false,
    faceOpenFront: false,
    faceOpenBack: false,
    faceOpenLeft: false,
    faceOpenRight: false,

    // Blender-like face edit
    faceInsetTop: 0,
    faceInsetBottom: 0,
    faceInsetFront: 0,
    faceInsetBack: 0,
    faceInsetLeft: 0,
    faceInsetRight: 0,

    faceExtrudeTop: 0,
    faceExtrudeBottom: 0,
    faceExtrudeFront: 0,
    faceExtrudeBack: 0,
    faceExtrudeLeft: 0,
    faceExtrudeRight: 0,
  },
];

export const ROUNDED_BOX_DEFAULT_RADIUS = 40;

// ── Normalize helpers ────────────────────────────────────────────────────────
export function normalizeCornerRadius(value) {
  return Math.max(0, Math.min(500, Number(value) || 0));
}

export function normalizeBoxThickness(value, fallback = 20) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.max(10, Math.min(500, num));
}

export function normalizeBoxFaceKey(value) {
  const key = String(value || "").toLowerCase();
  return BOX_FACE_KEYS.includes(key) ? key : "top";
}

export function normalizeBoxInset(value, max = 500) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.max(0, Math.min(max, num));
}

export function normalizeBoxFaceExtrude(value, max = 500) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.max(0, Math.min(max, num));
}

function capFaceKey(faceKey = "top") {
  const key = normalizeBoxFaceKey(faceKey);
  return `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function getFaceFieldValue(options = {}, prefix, faceKey) {
  const key = `${prefix}${capFaceKey(faceKey)}`;
  return Number(options?.[key]) || 0;
}

function buildRoundedRectShape(width, height, radius = 0) {
  const shape = new THREE.Shape();

  const hw = width / 2;
  const hh = height / 2;
  const r = Math.max(0, Math.min(radius, hw - 1, hh - 1));

  if (r <= 0) {
    shape.moveTo(-hw, -hh);
    shape.lineTo(hw, -hh);
    shape.lineTo(hw, hh);
    shape.lineTo(-hw, hh);
    shape.closePath();
    return shape;
  }

  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  shape.closePath();

  return shape;
}

function decorateMesh(mesh, rootId, faceKey = null) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.rootId = rootId;
  if (faceKey) mesh.userData.faceKey = faceKey;
  return mesh;
}

function createFaceMaterial(material, isActiveFace = false) {
  const mat = material.clone();

  if (isActiveFace) {
    if ("emissive" in mat) {
      mat.emissive = new THREE.Color("#60a5fa");
      mat.emissiveIntensity = 0.22;
    }

    if (mat.color) {
      mat.color = mat.color.clone().lerp(new THREE.Color("#ffffff"), 0.08);
    }
  }

  return mat;
}

function createSolidRoundedMesh(
  w,
  h,
  d,
  r,
  material,
  rootId,
  faceKey = null,
  isActiveFace = false,
) {
  const radius = Math.max(0, Math.min(r, w / 2 - 1, h / 2 - 1, d / 2 - 1));
  const faceMaterial = createFaceMaterial(material, isActiveFace);

  let mesh;

  if (radius <= 0) {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), faceMaterial);
    return decorateMesh(mesh, rootId, faceKey);
  }

  const shape = buildRoundedRectShape(w, h, radius);
  const bevel = Math.min(radius * 0.4, d * 0.18, 12);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1, d - bevel * 2),
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 12,
  });

  geo.center();

  mesh = new THREE.Mesh(geo, faceMaterial);
  return decorateMesh(mesh, rootId, faceKey);
}

function createPlanMesh(
  width,
  depth,
  thickness,
  radius,
  material,
  rootId,
  faceKey = null,
  isActiveFace = false,
) {
  const planRadius = Math.max(
    0,
    Math.min(radius, width / 2 - 1, depth / 2 - 1),
  );

  const shape = buildRoundedRectShape(width, depth, planRadius);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1, thickness),
    bevelEnabled: false,
    curveSegments: 16,
  });

  geo.center();
  geo.rotateX(Math.PI / 2);

  const mesh = new THREE.Mesh(
    geo,
    createFaceMaterial(material, isActiveFace),
  );
  return decorateMesh(mesh, rootId, faceKey);
}

function getFaceOpenings(options = {}) {
  return {
    top:
      options.faceOpenTop !== undefined
        ? !!options.faceOpenTop
        : !!options.openTop,
    bottom: !!options.faceOpenBottom,
    front: !!options.faceOpenFront,
    back: !!options.faceOpenBack,
    left: !!options.faceOpenLeft,
    right: !!options.faceOpenRight,
  };
}

function normalizeShellOptions(w, h, d, options = {}) {
  const requestedWall = normalizeBoxThickness(options.wallThickness, 20);
  const requestedBottom = normalizeBoxThickness(
    options.bottomThickness,
    requestedWall,
  );

  const maxWall = Math.max(10, Math.floor(Math.min(w, d) / 2) - 10);
  const maxBottom = Math.max(10, Math.floor(h) - 20);

  const faceInsets = {
    top: normalizeBoxInset(
      getFaceFieldValue(options, "faceInset", "top"),
      Math.max(0, Math.floor(Math.min(w, d) / 2) - 20),
    ),
    bottom: normalizeBoxInset(
      getFaceFieldValue(options, "faceInset", "bottom"),
      Math.max(0, Math.floor(Math.min(w, d) / 2) - 20),
    ),
    front: normalizeBoxInset(
      getFaceFieldValue(options, "faceInset", "front"),
      Math.max(0, Math.floor(Math.min(w, h) / 2) - 20),
    ),
    back: normalizeBoxInset(
      getFaceFieldValue(options, "faceInset", "back"),
      Math.max(0, Math.floor(Math.min(w, h) / 2) - 20),
    ),
    left: normalizeBoxInset(
      getFaceFieldValue(options, "faceInset", "left"),
      Math.max(0, Math.floor(Math.min(d, h) / 2) - 20),
    ),
    right: normalizeBoxInset(
      getFaceFieldValue(options, "faceInset", "right"),
      Math.max(0, Math.floor(Math.min(d, h) / 2) - 20),
    ),
  };

  const faceExtrudes = {
    top: normalizeBoxFaceExtrude(
      getFaceFieldValue(options, "faceExtrude", "top"),
      Math.max(0, Math.floor(h) - 20),
    ),
    bottom: normalizeBoxFaceExtrude(
      getFaceFieldValue(options, "faceExtrude", "bottom"),
      Math.max(0, Math.floor(h) - 20),
    ),
    front: normalizeBoxFaceExtrude(
      getFaceFieldValue(options, "faceExtrude", "front"),
      Math.max(0, Math.floor(d) - 20),
    ),
    back: normalizeBoxFaceExtrude(
      getFaceFieldValue(options, "faceExtrude", "back"),
      Math.max(0, Math.floor(d) - 20),
    ),
    left: normalizeBoxFaceExtrude(
      getFaceFieldValue(options, "faceExtrude", "left"),
      Math.max(0, Math.floor(w) - 20),
    ),
    right: normalizeBoxFaceExtrude(
      getFaceFieldValue(options, "faceExtrude", "right"),
      Math.max(0, Math.floor(w) - 20),
    ),
  };

  return {
    isHollow: !!options.isHollow,
    wallThickness: Math.max(10, Math.min(maxWall, requestedWall)),
    bottomThickness: Math.max(10, Math.min(maxBottom, requestedBottom)),
    selectedFace: normalizeBoxFaceKey(options.selectedFace),
    faces: getFaceOpenings(options),
    faceInsets,
    faceExtrudes,
  };
}

function addFaceMesh(shellGroup, selectableMeshes, mesh, x, y, z) {
  mesh.position.set(x, y, z);
  shellGroup.add(mesh);
  selectableMeshes.push(mesh);
  return mesh;
}

function addTopInsetExtrudeShellBox(
  root,
  selectableMeshes,
  w,
  h,
  d,
  r,
  material,
  rootId,
  shell,
) {
  const {
    wallThickness,
    bottomThickness,
    selectedFace,
    faceInsets,
    faceExtrudes,
  } = shell;

  const shellGroup = new THREE.Group();
  shellGroup.userData.rootId = rootId;
  root.add(shellGroup);

  const topThickness = wallThickness;
  const topInset = Math.max(10, faceInsets.top);
  const topExtrude = Math.max(0, faceExtrudes.top);

  const rimY = h / 2 - topThickness / 2;
  const outerWallHeight = Math.max(20, h - bottomThickness);
  const outerWallCenterY = -h / 2 + bottomThickness + outerWallHeight / 2;

  const openingW = Math.max(20, w - topInset * 2);
  const openingD = Math.max(20, d - topInset * 2);

  const insetFaceY = h / 2 - topThickness / 2 - topExtrude;
  const innerWallHeight = Math.max(0, topExtrude);
  const innerWallCenterY = h / 2 - innerWallHeight / 2;

  const outerSideDepth = Math.max(20, d - wallThickness * 2);
  const innerSideDepth = Math.max(10, openingD - wallThickness * 2);

  // bottom
  addFaceMesh(
    shellGroup,
    selectableMeshes,
    createPlanMesh(
      w,
      d,
      bottomThickness,
      r,
      material,
      rootId,
      "bottom",
      selectedFace === "bottom",
    ),
    0,
    -h / 2 + bottomThickness / 2,
    0,
  );

  // outer walls (open-top shell look)
  addFaceMesh(
    shellGroup,
    selectableMeshes,
    createSolidRoundedMesh(
      w,
      outerWallHeight,
      wallThickness,
      Math.min(r, wallThickness * 0.45),
      material,
      rootId,
      "front",
      selectedFace === "front",
    ),
    0,
    outerWallCenterY,
    d / 2 - wallThickness / 2,
  );

  addFaceMesh(
    shellGroup,
    selectableMeshes,
    createSolidRoundedMesh(
      w,
      outerWallHeight,
      wallThickness,
      Math.min(r, wallThickness * 0.45),
      material,
      rootId,
      "back",
      selectedFace === "back",
    ),
    0,
    outerWallCenterY,
    -d / 2 + wallThickness / 2,
  );

  addFaceMesh(
    shellGroup,
    selectableMeshes,
    createSolidRoundedMesh(
      wallThickness,
      outerWallHeight,
      outerSideDepth,
      Math.min(r, wallThickness * 0.45),
      material,
      rootId,
      "left",
      selectedFace === "left",
    ),
    -w / 2 + wallThickness / 2,
    outerWallCenterY,
    0,
  );

  addFaceMesh(
    shellGroup,
    selectableMeshes,
    createSolidRoundedMesh(
      wallThickness,
      outerWallHeight,
      outerSideDepth,
      Math.min(r, wallThickness * 0.45),
      material,
      rootId,
      "right",
      selectedFace === "right",
    ),
    w / 2 - wallThickness / 2,
    outerWallCenterY,
    0,
  );

  // top rim strips — this is the Blender-like inset border
  addFaceMesh(
    shellGroup,
    selectableMeshes,
    createPlanMesh(
      w,
      topInset,
      topThickness,
      r,
      material,
      rootId,
      "top",
      selectedFace === "top",
    ),
    0,
    rimY,
    d / 2 - topInset / 2,
  );

  addFaceMesh(
    shellGroup,
    selectableMeshes,
    createPlanMesh(
      w,
      topInset,
      topThickness,
      r,
      material,
      rootId,
      "top",
      selectedFace === "top",
    ),
    0,
    rimY,
    -d / 2 + topInset / 2,
  );

  addFaceMesh(
    shellGroup,
    selectableMeshes,
    createPlanMesh(
      topInset,
      openingD,
      topThickness,
      Math.min(r, topInset * 0.45),
      material,
      rootId,
      "top",
      selectedFace === "top",
    ),
    -w / 2 + topInset / 2,
    rimY,
    0,
  );

  addFaceMesh(
    shellGroup,
    selectableMeshes,
    createPlanMesh(
      topInset,
      openingD,
      topThickness,
      Math.min(r, topInset * 0.45),
      material,
      rootId,
      "top",
      selectedFace === "top",
    ),
    w / 2 - topInset / 2,
    rimY,
    0,
  );

  // inset face (the selected top face after inset / extrude)
  addFaceMesh(
    shellGroup,
    selectableMeshes,
    createPlanMesh(
      openingW,
      openingD,
      topThickness,
      Math.max(0, r - topInset * 0.25),
      material,
      rootId,
      "top",
      selectedFace === "top",
    ),
    0,
    insetFaceY,
    0,
  );

  // inner cavity walls — only if extruded downward
  if (innerWallHeight > 0) {
    addFaceMesh(
      shellGroup,
      selectableMeshes,
      createSolidRoundedMesh(
        openingW,
        innerWallHeight,
        wallThickness,
        Math.min(r, wallThickness * 0.3),
        material,
        rootId,
        "top",
        selectedFace === "top",
      ),
      0,
      innerWallCenterY,
      d / 2 - topInset - wallThickness / 2,
    );

    addFaceMesh(
      shellGroup,
      selectableMeshes,
      createSolidRoundedMesh(
        openingW,
        innerWallHeight,
        wallThickness,
        Math.min(r, wallThickness * 0.3),
        material,
        rootId,
        "top",
        selectedFace === "top",
      ),
      0,
      innerWallCenterY,
      -d / 2 + topInset + wallThickness / 2,
    );

    addFaceMesh(
      shellGroup,
      selectableMeshes,
      createSolidRoundedMesh(
        wallThickness,
        innerWallHeight,
        innerSideDepth,
        Math.min(r, wallThickness * 0.3),
        material,
        rootId,
        "top",
        selectedFace === "top",
      ),
      -w / 2 + topInset + wallThickness / 2,
      innerWallCenterY,
      0,
    );

    addFaceMesh(
      shellGroup,
      selectableMeshes,
      createSolidRoundedMesh(
        wallThickness,
        innerWallHeight,
        innerSideDepth,
        Math.min(r, wallThickness * 0.3),
        material,
        rootId,
        "top",
        selectedFace === "top",
      ),
      w / 2 - topInset - wallThickness / 2,
      innerWallCenterY,
      0,
    );
  }

  return shellGroup;
}

function addRoundedGenericShellBox(
  root,
  selectableMeshes,
  w,
  h,
  d,
  r,
  material,
  rootId,
  shell,
) {
  const {
    wallThickness,
    bottomThickness,
    selectedFace,
    faces,
    faceInsets,
    faceExtrudes,
  } = shell;

  const shellGroup = new THREE.Group();
  shellGroup.userData.rootId = rootId;
  root.add(shellGroup);

  const topThickness = wallThickness;

  const topInsetForWalls = faces.top ? 0 : topThickness;
  const bottomInsetForWalls = faces.bottom ? 0 : bottomThickness;
  const frontInsetForWalls = faces.front ? 0 : wallThickness;
  const backInsetForWalls = faces.back ? 0 : wallThickness;
  const leftInsetForWalls = faces.left ? 0 : wallThickness;
  const rightInsetForWalls = faces.right ? 0 : wallThickness;

  const wallHeight = Math.max(20, h - topInsetForWalls - bottomInsetForWalls);
  const wallCenterY = -h / 2 + bottomInsetForWalls + wallHeight / 2;

  const faceWidth = Math.max(20, w - leftInsetForWalls - rightInsetForWalls);
  const sideDepth = Math.max(20, d - frontInsetForWalls - backInsetForWalls);

  if (!faces.bottom) {
    const inset = faceInsets.bottom;
    const panelW = Math.max(20, w - inset * 2);
    const panelD = Math.max(20, d - inset * 2);

    addFaceMesh(
      shellGroup,
      selectableMeshes,
      createPlanMesh(
        panelW,
        panelD,
        bottomThickness,
        r,
        material,
        rootId,
        "bottom",
        selectedFace === "bottom",
      ),
      0,
      -h / 2 + bottomThickness / 2 + faceExtrudes.bottom,
      0,
    );
  }

  if (!faces.top) {
    const inset = faceInsets.top;
    const panelW = Math.max(20, w - inset * 2);
    const panelD = Math.max(20, d - inset * 2);

    addFaceMesh(
      shellGroup,
      selectableMeshes,
      createPlanMesh(
        panelW,
        panelD,
        topThickness,
        r,
        material,
        rootId,
        "top",
        selectedFace === "top",
      ),
      0,
      h / 2 - topThickness / 2 - faceExtrudes.top,
      0,
    );
  }

  if (!faces.front) {
    const inset = faceInsets.front;
    const panelW = Math.max(20, faceWidth - inset * 2);
    const panelH = Math.max(20, wallHeight - inset * 2);

    addFaceMesh(
      shellGroup,
      selectableMeshes,
      createSolidRoundedMesh(
        panelW,
        panelH,
        wallThickness,
        Math.min(r, wallThickness * 0.45),
        material,
        rootId,
        "front",
        selectedFace === "front",
      ),
      0,
      wallCenterY,
      d / 2 - wallThickness / 2 - faceExtrudes.front,
    );
  }

  if (!faces.back) {
    const inset = faceInsets.back;
    const panelW = Math.max(20, faceWidth - inset * 2);
    const panelH = Math.max(20, wallHeight - inset * 2);

    addFaceMesh(
      shellGroup,
      selectableMeshes,
      createSolidRoundedMesh(
        panelW,
        panelH,
        wallThickness,
        Math.min(r, wallThickness * 0.45),
        material,
        rootId,
        "back",
        selectedFace === "back",
      ),
      0,
      wallCenterY,
      -d / 2 + wallThickness / 2 + faceExtrudes.back,
    );
  }

  if (!faces.left) {
    const inset = faceInsets.left;
    const panelH = Math.max(20, wallHeight - inset * 2);
    const panelD = Math.max(20, sideDepth - inset * 2);

    addFaceMesh(
      shellGroup,
      selectableMeshes,
      createSolidRoundedMesh(
        wallThickness,
        panelH,
        panelD,
        Math.min(r, wallThickness * 0.45),
        material,
        rootId,
        "left",
        selectedFace === "left",
      ),
      -w / 2 + wallThickness / 2 + faceExtrudes.left,
      wallCenterY,
      0,
    );
  }

  if (!faces.right) {
    const inset = faceInsets.right;
    const panelH = Math.max(20, wallHeight - inset * 2);
    const panelD = Math.max(20, sideDepth - inset * 2);

    addFaceMesh(
      shellGroup,
      selectableMeshes,
      createSolidRoundedMesh(
        wallThickness,
        panelH,
        panelD,
        Math.min(r, wallThickness * 0.45),
        material,
        rootId,
        "right",
        selectedFace === "right",
      ),
      w / 2 - wallThickness / 2 - faceExtrudes.right,
      wallCenterY,
      0,
    );
  }

  return shellGroup;
}

// ── Core builder ─────────────────────────────────────────────────────────────
export function addRoundedBox(
  root,
  selectableMeshes,
  w,
  h,
  d,
  r,
  material,
  rootId,
  options = {},
) {
  const shell = normalizeShellOptions(w, h, d, options);

  const hasManualOpenings = Object.values(shell.faces).some(Boolean);
  const hasFaceEdits = [
    ...Object.values(shell.faceInsets),
    ...Object.values(shell.faceExtrudes),
  ].some((value) => Number(value) > 0);

  const hasTopInsetExtrudeStyle =
    !shell.faces.top &&
    Number(shell.faceInsets.top) > 0;

  if (shell.isHollow || hasManualOpenings || hasFaceEdits) {
    if (hasTopInsetExtrudeStyle) {
      return addTopInsetExtrudeShellBox(
        root,
        selectableMeshes,
        w,
        h,
        d,
        r,
        material,
        rootId,
        shell,
      );
    }

    return addRoundedGenericShellBox(
      root,
      selectableMeshes,
      w,
      h,
      d,
      r,
      material,
      rootId,
      shell,
    );
  }

  const mesh = createSolidRoundedMesh(w, h, d, r, material, rootId);
  root.add(mesh);
  selectableMeshes.push(mesh);
  return mesh;
}

// ── Smart Box ────────────────────────────────────────────────────────────────
export function addSmartBox(
  root,
  selectableMeshes,
  dims,
  pos,
  material,
  rootId,
  r = 0,
  options = {},
) {
  const mesh = addRoundedBox(
    root,
    selectableMeshes,
    dims[0],
    dims[1],
    dims[2],
    r,
    material,
    rootId,
    options,
  );
  mesh.position.set(pos[0], pos[1], pos[2]);
  return mesh;
}

// ── Smart Panel ──────────────────────────────────────────────────────────────
export function addSmartPanel(
  root,
  selectableMeshes,
  w,
  h,
  d,
  x,
  y,
  z,
  material,
  rootId,
  r = 0,
) {
  if (r > 0) {
    const mesh = addRoundedBox(
      root,
      selectableMeshes,
      w,
      h,
      d,
      r,
      material,
      rootId,
    );
    mesh.position.set(x, y, z);
    return mesh;
  }

  const shape = new THREE.Shape();
  const rp = Math.min(6, w * 0.08, h * 0.08);

  shape.moveTo(-w / 2 + rp, -h / 2);
  shape.lineTo(w / 2 - rp, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + rp);
  shape.lineTo(w / 2, h / 2 - rp);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - rp, h / 2);
  shape.lineTo(-w / 2 + rp, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - rp);
  shape.lineTo(-w / 2, -h / 2 + rp);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + rp, -h / 2);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.8,
    bevelThickness: 0.8,
  });

  geo.center();

  const mesh = new THREE.Mesh(geo, material.clone());
  mesh.position.set(x, y, z);
  decorateMesh(mesh, rootId);
  root.add(mesh);
  selectableMeshes.push(mesh);
  return mesh;
}