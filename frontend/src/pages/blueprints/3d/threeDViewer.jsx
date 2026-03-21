// 3d/ThreeDViewer.jsx — Three.js scene, inspector panels, and toolbar
import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { createFurnitureObject } from "./createFurnitureObjects";
import {
  WOOD_FINISHES,
  VIEWS,
  CASEWORK_SET,
  CHAIR_PART_SET,
  COMPONENT_LIBRARY_GROUPS,
} from "../data/furnitureTypes";
import {
  applyWoodFinish,
  isWoodLikeMaterial,
  normalizeComponent,
} from "../data/componentUtils";
import {
  snap,
  clamp,
  makeId,
  mmToDisplay,
  displayToMm,
  formatDim,
  formatDims,
} from "../data/utils";
import S from "../styles/blueprintStyles";

const GRID_SIZE = 20;
const FLOOR_OFFSET = 40;
const MM_PER_INCH = 25.4;

function Floating3DPalette({ onAdd, activeBuildLabel }) {
  return (
    <div style={S.floatingPanelLeft}>
      <div style={S.floatingTitle}>Furniture Library</div>

      {COMPONENT_LIBRARY_GROUPS.map((group) => (
        <div key={group.label} style={{ marginBottom: 10 }}>
          <div style={S.floatingSectionLabel}>{group.label}</div>
          <div style={{ display: "grid", gap: 6 }}>
            {group.items.map((t) => (
              <button
                key={`${group.label}-${t.type}`}
                onClick={() => onAdd(t)}
                style={
                  t.type === "chair_template"
                    ? S.floatingPrimaryBtn
                    : S.floatingPaletteBtn
                }
              >
                {t.fill ? (
                  <span
                    style={{
                      width: 11,
                      height: 11,
                      background: t.fill,
                      borderRadius: 2,
                      flexShrink: 0,
                    }}
                  />
                ) : null}
                <span style={{ flex: 1, textAlign: "left" }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Floating3DInspector({
  selectedComp,
  isLocked,
  onChange,
  unit,
  editorMode,
}) {
  if (!selectedComp) return null;

  const handleNumericChange = (key) => (e) => {
    onChange(selectedComp.id, {
      [key]: displayToMm(e.target.value, unit),
    });
  };

  const unitLabel = unit === "inch" ? "in" : "mm";

  return (
    <div style={S.floatingPanelRight}>
      <div style={S.floatingTitle}>Selected Object</div>

      <div style={S.infoCard}>
        <div>
          <b>
            {selectedComp.partCode
              ? `${selectedComp.partCode} — ${selectedComp.label}`
              : selectedComp.label}
          </b>
        </div>
        <div>
          {formatDims(
            selectedComp.width,
            selectedComp.height,
            selectedComp.depth,
            unit,
          )}
        </div>
        <div>
          X {formatDim(selectedComp.x, unit)} · Y{" "}
          {formatDim(selectedComp.y, unit)} · Z{" "}
          {formatDim(selectedComp.z, unit)}
        </div>
        <div>Rot Y: {selectedComp.rotationY || 0}°</div>
        <div>{selectedComp.material || "—"}</div>
      </div>

      {[
        ["Width", "width"],
        ["Height", "height"],
        ["Depth", "depth"],
        ["X", "x"],
        ["Y", "y"],
        ["Z", "z"],
      ].map(([label, key]) => (
        <div key={key} style={{ marginBottom: 6 }}>
          <label style={S.floatingLabel}>
            {label} ({unitLabel})
          </label>
          <input
            type="number"
            step={unit === "inch" ? "0.01" : "1"}
            value={mmToDisplay(selectedComp[key] ?? 0, unit)}
            disabled={editorMode !== "editable" || isLocked(selectedComp)}
            onChange={handleNumericChange(key)}
            style={S.floatingInput}
          />
        </div>
      ))}

      {/* Corner Radius — available for ALL objects */}
      <div style={{ marginBottom: 6 }}>
        <label style={S.floatingLabel}>
          Corner Radius (mm) — current: {selectedComp.cornerRadius ?? 0}mm
        </label>
        <input
          type="range"
          min="0"
          max="500"
          step="5"
          value={selectedComp.cornerRadius ?? 0}
          disabled={editorMode !== "editable" || isLocked(selectedComp)}
          onChange={(e) =>
            onChange(selectedComp.id, {
              cornerRadius: Number(e.target.value),
            })
          }
          style={{ width: "100%", accentColor: "#3b82f6" }}
        />
        <input
          type="number"
          min="0"
          max="500"
          step="5"
          value={selectedComp.cornerRadius ?? 0}
          disabled={editorMode !== "editable" || isLocked(selectedComp)}
          onChange={(e) =>
            onChange(selectedComp.id, {
              cornerRadius: Math.max(
                0,
                Math.min(500, Number(e.target.value) || 0),
              ),
            })
          }
          style={S.floatingInput}
        />
      </div>

      {/* Top Width Ratio — trapezoid only */}
      {selectedComp.type === "shape_trapezoid" && (
        <div style={{ marginBottom: 6 }}>
          <label style={S.floatingLabel}>
            Top Width Ratio — {Math.round((selectedComp.topRatio ?? 0.5) * 100)}
            %
          </label>
          <input
            type="range"
            min="5"
            max="98"
            step="1"
            value={Math.round((selectedComp.topRatio ?? 0.5) * 100)}
            disabled={editorMode !== "editable" || isLocked(selectedComp)}
            onChange={(e) =>
              onChange(selectedComp.id, {
                topRatio: Number(e.target.value) / 100,
              })
            }
            style={{ width: "100%", accentColor: "#f59e0b", marginBottom: 4 }}
          />
        </div>
      )}

      <div style={{ marginBottom: 6 }}>
        <label style={S.floatingLabel}>Qty</label>
        <input
          type="number"
          value={selectedComp.rotationY ?? 0}
          disabled={editorMode !== "editable" || isLocked(selectedComp)}
          onChange={(e) =>
            onChange(selectedComp.id, {
              rotationY: parseFloat(e.target.value) || 0,
            })
          }
          style={S.floatingInput}
        />
      </div>

      <div style={{ marginBottom: 6 }}>
        <label style={S.floatingLabel}>Label</label>
        <input
          value={selectedComp.label || ""}
          disabled={editorMode !== "editable" || isLocked(selectedComp)}
          onChange={(e) => onChange(selectedComp.id, { label: e.target.value })}
          style={S.floatingInput}
        />
      </div>

      <div style={{ marginBottom: 6 }}>
        <label style={S.floatingLabel}>Fill Color</label>
        <input
          type="color"
          value={selectedComp.fill || "#d9c2a5"}
          disabled={editorMode !== "editable" || isLocked(selectedComp)}
          onChange={(e) =>
            onChange(selectedComp.id, {
              fill: e.target.value,
              finish: "",
            })
          }
          style={{
            ...S.floatingInput,
            padding: 2,
            height: 36,
          }}
        />
      </div>

      <div style={{ marginBottom: 6 }}>
        <label style={S.floatingLabel}>Material</label>
        <input
          value={selectedComp.material || ""}
          disabled={editorMode !== "editable" || isLocked(selectedComp)}
          onChange={(e) =>
            onChange(selectedComp.id, { material: e.target.value })
          }
          style={S.floatingInput}
        />
      </div>

      {(isWoodLikeMaterial(selectedComp.material) ||
        selectedComp.finish !== undefined) && (
        <div style={{ marginBottom: 6 }}>
          <label style={S.floatingLabel}>Wood Finish</label>
          <select
            value={selectedComp.finish ?? ""}
            disabled={editorMode !== "editable" || isLocked(selectedComp)}
            onChange={(e) =>
              onChange(
                selectedComp.id,
                applyWoodFinish(selectedComp, e.target.value),
              )
            }
            style={S.floatingInput}
          >
            <option value="">Custom Color</option>
            {WOOD_FINISHES.map((finish) => (
              <option key={finish.id} value={finish.id}>
                {finish.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ marginBottom: 6 }}>
        <label style={S.floatingLabel}>Qty</label>
        <input
          type="number"
          min="1"
          value={selectedComp.qty || 1}
          disabled={editorMode !== "editable" || isLocked(selectedComp)}
          onChange={(e) =>
            onChange(selectedComp.id, {
              qty: Math.max(1, parseInt(e.target.value || "1", 10)),
            })
          }
          style={S.floatingInput}
        />
      </div>
    </div>
  );
}

function ToolSidebar({ transformMode, setTransformMode, hasSelection }) {
  const handleToolClick = (mode) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasSelection) setTransformMode(mode);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      style={S.unityToolbar}
      onMouseDown={handleMouseDown}
      onPointerDown={handleMouseDown}
    >
      <button
        title="Move"
        onMouseDown={handleMouseDown}
        onPointerDown={handleMouseDown}
        onClick={handleToolClick("translate")}
        disabled={!hasSelection}
        style={{
          ...S.unityToolBtn,
          ...(transformMode === "translate" ? S.unityToolBtnActive : {}),
          opacity: hasSelection ? 1 : 0.45,
        }}
      >
        ↕
      </button>

      <button
        title="Rotate"
        onMouseDown={handleMouseDown}
        onPointerDown={handleMouseDown}
        onClick={handleToolClick("rotate")}
        disabled={!hasSelection}
        style={{
          ...S.unityToolBtn,
          ...(transformMode === "rotate" ? S.unityToolBtnActive : {}),
          opacity: hasSelection ? 1 : 0.45,
        }}
      >
        ↻
      </button>

      <button
        title="Resize / Scale"
        onMouseDown={handleMouseDown}
        onPointerDown={handleMouseDown}
        onClick={handleToolClick("scale")}
        disabled={!hasSelection}
        style={{
          ...S.unityToolBtn,
          ...(transformMode === "scale" ? S.unityToolBtnActive : {}),
          opacity: hasSelection ? 1 : 0.45,
        }}
      >
        ⤢
      </button>
    </div>
  );
}

function ThreeDViewer({
  onPushHistory,
  components,
  selectedId,
  selectedIds,
  edit3DId,
  setSelectedId,
  setSelectedIds,
  setEdit3DId,
  onUpdateComp,
  lockedFields,
  canvasW,
  canvasH,
  canvasD,
  transformMode,
  setTransformMode,
  addComponent,
  activeBuildLabel,
  selectedComp,
  isLocked,
  unit,
  editorMode,
}) {
  const onPushHistoryRef = useRef(onPushHistory);
  const onBeforeDragRef = useRef(null);

  const mountRef = useRef(null);

  const cameraRef = useRef(null);
  const orbitRef = useRef(null);
  const transformRef = useRef(null);
  const rootGroupRef = useRef(null);

  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const entryMapRef = useRef(new Map());
  const selectableMeshesRef = useRef([]);

  const selectedIdRef = useRef(selectedId);
  const edit3DIdRef = useRef(edit3DId);
  const transformModeRef = useRef(transformMode);

  const onUpdateCompRef = useRef(onUpdateComp);
  const setSelectedIdRef = useRef(setSelectedId);
  const setEdit3DIdRef = useRef(setEdit3DId);
  const setSelectedIdsRef = useRef(setSelectedIds);
  const componentsRef = useRef(components);

  const didInitialFitRef = useRef(false);

  const cameraViewRef = useRef(null);
  const restoreRafRef = useRef(0);

  useEffect(() => {
    onPushHistoryRef.current = onPushHistory;
  }, [onPushHistory]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    edit3DIdRef.current = edit3DId;
  }, [edit3DId]);

  useEffect(() => {
    setSelectedIdsRef.current = setSelectedIds;
  }, [setSelectedIds]);

  useEffect(() => {
    componentsRef.current = components;
  }, [components]);

  useEffect(() => {
    transformModeRef.current = transformMode;
  }, [transformMode]);

  useEffect(() => {
    onUpdateCompRef.current = onUpdateComp;
  }, [onUpdateComp]);

  useEffect(() => {
    setSelectedIdRef.current = setSelectedId;
  }, [setSelectedId]);

  useEffect(() => {
    setEdit3DIdRef.current = setEdit3DId;
  }, [setEdit3DId]);

  const isLocked3D = useCallback(
    (comp) =>
      comp.locked ||
      lockedFields.includes(comp.type) ||
      lockedFields.includes("all"),
    [lockedFields],
  );

  const isLocked3DRef = useRef(isLocked3D);
  useEffect(() => {
    isLocked3DRef.current = isLocked3D;
  }, [isLocked3D]);

  const worldFromComp = useCallback(
    (comp) => ({
      x: comp.x + comp.width / 2 - canvasW / 2,
      y: canvasH / 2 - (comp.y + comp.height / 2),
      z: comp.z + comp.depth / 2 - canvasD / 2,
    }),
    [canvasW, canvasH, canvasD],
  );

  const compFromWorld = useCallback(
    (obj, comp) => ({
      x: snap(obj.position.x - comp.width / 2 + canvasW / 2),
      y: snap(canvasH / 2 - obj.position.y - comp.height / 2),
      z: snap(obj.position.z - comp.depth / 2 + canvasD / 2),
      rotationY: Math.round(THREE.MathUtils.radToDeg(obj.rotation.y) / 15) * 15,
      width: snap(Math.max(GRID_SIZE, comp.width * obj.scale.x)),
      height: snap(Math.max(GRID_SIZE, comp.height * obj.scale.y)),
      depth: snap(Math.max(GRID_SIZE, comp.depth * obj.scale.z)),
    }),
    [canvasW, canvasH, canvasD],
  );

  const captureCameraView = useCallback(() => {
    const camera = cameraRef.current;
    const orbit = orbitRef.current;
    if (!camera || !orbit) return null;

    return {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      target: orbit.target.clone(),
      zoom: camera.zoom,
    };
  }, []);

  const storeCameraView = useCallback(() => {
    const snapshot = captureCameraView();
    if (snapshot) cameraViewRef.current = snapshot;
    return snapshot;
  }, [captureCameraView]);

  const restoreCameraView = useCallback((snapshot) => {
    const camera = cameraRef.current;
    const orbit = orbitRef.current;
    if (!camera || !orbit || !snapshot) return;

    camera.position.copy(snapshot.position);
    camera.quaternion.copy(snapshot.quaternion);
    camera.zoom = snapshot.zoom ?? camera.zoom;
    camera.updateProjectionMatrix();
    orbit.target.copy(snapshot.target);
    orbit.update();
  }, []);

  const preserveCameraView = useCallback(
    (fn) => {
      const before = captureCameraView() || cameraViewRef.current;
      fn?.();

      if (!before) return;

      restoreCameraView(before);
      cameraViewRef.current = before;

      if (restoreRafRef.current) cancelAnimationFrame(restoreRafRef.current);
      restoreRafRef.current = requestAnimationFrame(() => {
        restoreCameraView(before);
        cameraViewRef.current = before;
      });
    },
    [captureCameraView, restoreCameraView],
  );

  const centerOnObject = useCallback(
    (obj, instant = false) => {
      const camera = cameraRef.current;
      const orbit = orbitRef.current;
      if (!obj || !camera || !orbit) return;

      const box = new THREE.Box3().setFromObject(obj);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);

      orbit.target.copy(center);

      if (instant) {
        const maxSize = Math.max(size.x, size.y, size.z, 120);
        const fitHeightDistance =
          maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
        const fitWidthDistance = fitHeightDistance / camera.aspect;
        const dist = Math.max(fitHeightDistance, fitWidthDistance) * 1.9;

        camera.position.set(
          center.x + dist,
          center.y + dist * 0.65,
          center.z + dist,
        );
        camera.near = 0.1;
        camera.far = Math.max(18000, dist * 8);
        camera.updateProjectionMatrix();
      }

      orbit.update();
      storeCameraView();
    },
    [storeCameraView],
  );

  const fitCameraToRoot = useCallback(
    (padding = 1.45) => {
      const camera = cameraRef.current;
      const orbit = orbitRef.current;
      const rootGroup = rootGroupRef.current;

      if (!camera || !orbit || !rootGroup || !rootGroup.children.length) return;

      const bounds = new THREE.Box3().setFromObject(rootGroup);
      if (bounds.isEmpty()) return;

      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      bounds.getCenter(center);
      bounds.getSize(size);

      const maxSize = Math.max(size.x, size.y, size.z, 1);
      const fitHeightDistance =
        maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)));
      const fitWidthDistance = fitHeightDistance / camera.aspect;
      const distance = Math.max(fitHeightDistance, fitWidthDistance) * padding;

      camera.position.set(
        center.x + distance,
        center.y + distance * 0.65,
        center.z + distance,
      );
      camera.near = 0.1;
      camera.far = Math.max(18000, distance * 8);
      camera.updateProjectionMatrix();

      orbit.target.copy(center);
      orbit.minDistance = 140;
      orbit.maxDistance = Math.max(9000, distance * 5);
      orbit.update();

      storeCameraView();
    },
    [storeCameraView],
  );

  const applyGizmoLook = useCallback(() => {
    const transform = transformRef.current;
    if (!transform) return;

    const forceAxisMaterial = (obj, hex) => {
      if (!obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (m.color) m.color.setHex(hex);
        m.depthTest = false;
        m.transparent = true;
        m.opacity = 1;
        m.toneMapped = false;
        m.fog = false;
      });
    };

    transform.traverse((child) => {
      const name = child.name || "";
      const geoType = child.geometry?.type || "";

      const isXAxis = name === "X";
      const isYAxis = name === "Y";
      const isZAxis = name === "Z";

      if (
        name.includes("XY") ||
        name.includes("YZ") ||
        name.includes("XZ") ||
        name === "E" ||
        name === "XYZ" ||
        name === "XYZE" ||
        name.includes("START") ||
        name.includes("END") ||
        name.includes("DELTA") ||
        name.includes("AXIS") ||
        name.includes("helper") ||
        geoType === "PlaneGeometry" ||
        geoType === "BoxGeometry"
      ) {
        child.visible = false;
        return;
      }

      if (!isXAxis && !isYAxis && !isZAxis) {
        if (child.type === "Line" || child.type === "Mesh")
          child.visible = false;
        return;
      }

      child.visible = true;

      if (isXAxis) forceAxisMaterial(child, 0xff3b30);
      if (isYAxis) forceAxisMaterial(child, 0x34c759);
      if (isZAxis) forceAxisMaterial(child, 0x0a84ff);
    });
  }, []);

  const applyTransformModeRaw = useCallback(() => {
    const transform = transformRef.current;
    if (!transform) return;

    const mode = transformModeRef.current;

    if (mode === "rotate") transform.setMode("rotate");
    else if (mode === "scale") transform.setMode("scale");
    else transform.setMode("translate");

    transform.showX = true;
    transform.showY = true;
    transform.showZ = true;

    applyGizmoLook();
  }, [applyGizmoLook]);

  const applyTransformMode = useCallback(() => {
    preserveCameraView(() => {
      applyTransformModeRaw();
    });
  }, [preserveCameraView, applyTransformModeRaw]);

  const attachSelectedRaw = useCallback(() => {
    const transform = transformRef.current;
    if (!transform) return;

    const currentSelectedId = selectedIdRef.current;
    const currentEdit3DId = edit3DIdRef.current;
    const entry = entryMapRef.current.get(currentSelectedId);

    if (
      editorMode === "editable" &&
      entry &&
      !isLocked3DRef.current(entry.comp) &&
      currentEdit3DId === currentSelectedId
    ) {
      transform.attach(entry.obj);
      applyTransformModeRaw();
    } else {
      transform.detach();
    }
  }, [applyTransformModeRaw]);

  const attachSelected = useCallback(() => {
    preserveCameraView(() => {
      attachSelectedRaw();
    });
  }, [preserveCameraView, attachSelectedRaw]);

  const rebuildObjects = useCallback(() => {
    console.log("3D rebuild components:", components);

    const rootGroup = rootGroupRef.current;
    if (!rootGroup) return;

    const savedView = captureCameraView() || cameraViewRef.current;

    while (rootGroup.children.length) {
      const child = rootGroup.children[0];
      rootGroup.remove(child);
      child.traverse?.((obj) => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material))
            obj.material.forEach((m) => m.dispose?.());
          else obj.material.dispose?.();
        }
      });
    }

    entryMapRef.current = new Map();
    selectableMeshesRef.current = [];

    components.forEach((raw) => {
      const comp = normalizeComponent(raw);
      const selected = selectedId === comp.id || selectedIds.includes(comp.id);
      const editing = edit3DId === comp.id;
      const obj = createFurnitureObject(
        comp,
        selected,
        editing,
        selectableMeshesRef.current,
      );
      const pos = worldFromComp(comp);

      obj.position.set(pos.x, pos.y, pos.z);
      obj.rotation.y = THREE.MathUtils.degToRad(comp.rotationY || 0);
      obj.scale.set(1, 1, 1);
      obj.userData.id = comp.id;

      rootGroup.add(obj);
      entryMapRef.current.set(comp.id, { obj, comp });
    });

    attachSelectedRaw();

    if (!didInitialFitRef.current && components.length > 0) {
      fitCameraToRoot(1.45);
      didInitialFitRef.current = true;
    } else if (savedView) {
      restoreCameraView(savedView);
      cameraViewRef.current = savedView;
    }
  }, [
    components,
    selectedId,
    edit3DId,
    worldFromComp,
    attachSelectedRaw,
    captureCameraView,
    restoreCameraView,
    storeCameraView,
    fitCameraToRoot,
  ]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || 1000;
    const h = mount.clientHeight || 700;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    renderer.setClearColor(0x16263d);
    mount.innerHTML = "";

    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x16263d);

    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 18000);
    camera.position.set(1100, 760, 1100);

    scene.add(new THREE.AmbientLight(0xffffff, 1.15));

    const hemi = new THREE.HemisphereLight(0xf4f8ff, 0x223248, 1.45);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(1400, 2200, 1200);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -3200;
    keyLight.shadow.camera.right = 3200;
    keyLight.shadow.camera.top = 3200;
    keyLight.shadow.camera.bottom = -3200;
    keyLight.shadow.bias = -0.00008;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.15);
    fillLight.position.set(-1500, 1000, 1300);
    scene.add(fillLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 0.95);
    frontLight.position.set(0, 900, 1800);
    scene.add(frontLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.6);
    rimLight.position.set(-1100, 700, -900);
    scene.add(rimLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 0.65);
    topLight.position.set(0, 2600, 0);
    scene.add(topLight);

    const floorBase = new THREE.Mesh(
      new THREE.PlaneGeometry(6800, 6800),
      new THREE.MeshStandardMaterial({
        color: 0x16263a,
        roughness: 0.94,
        metalness: 0.02,
      }),
    );
    floorBase.rotation.x = -Math.PI / 2;
    floorBase.position.y = -canvasH / 2 - 0.2;
    floorBase.receiveShadow = true;
    scene.add(floorBase);

    const floorShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(6800, 6800),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.12 }),
    );
    floorShadow.rotation.x = -Math.PI / 2;
    floorShadow.position.y = -canvasH / 2;
    floorShadow.receiveShadow = true;
    scene.add(floorShadow);

    const grid = new THREE.GridHelper(6000, 240, 0x4b89c8, 0x27405e);
    grid.position.y = -canvasH / 2 + 0.1;
    grid.material.opacity = 0.9;
    grid.material.transparent = true;
    scene.add(grid);

    const axisMatX = new THREE.LineBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.95,
    });
    const axisMatY = new THREE.LineBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.95,
    });
    const axisMatZ = new THREE.LineBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.95,
    });

    const makeAxis = (a, b, mat) =>
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...a),
          new THREE.Vector3(...b),
        ]),
        mat,
      );

    scene.add(
      makeAxis(
        [-3000, -canvasH / 2 + 0.2, 0],
        [3000, -canvasH / 2 + 0.2, 0],
        axisMatX,
      ),
    );
    scene.add(makeAxis([0, -canvasH / 2, 0], [0, 2800, 0], axisMatY));
    scene.add(
      makeAxis(
        [0, -canvasH / 2 + 0.2, -3000],
        [0, -canvasH / 2 + 0.2, 3000],
        axisMatZ,
      ),
    );

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.rotateSpeed = 0.9;
    orbit.panSpeed = 1;
    orbit.zoomSpeed = 1.05;
    orbit.minDistance = 140;
    orbit.maxDistance = 9500;
    orbit.maxPolarAngle = Math.PI / 2.02;
    orbit.target.set(0, 160, 0);
    orbit.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    orbit.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
    orbit.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    orbit.update();

    const transform = new TransformControls(camera, renderer.domElement);
    transform.setSpace("world");
    transform.setSize(0.86);
    transform.translationSnap = GRID_SIZE;
    transform.rotationSnap = THREE.MathUtils.degToRad(15);
    scene.add(transform);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    cameraRef.current = camera;
    orbitRef.current = orbit;
    transformRef.current = transform;
    rootGroupRef.current = rootGroup;

    storeCameraView();
    applyTransformModeRaw();

    const setMouseFromEvent = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const pickMesh = (event) => {
      setMouseFromEvent(event);
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const hits = raycasterRef.current.intersectObjects(
        selectableMeshesRef.current,
        false,
      );
      return hits[0] || null;
    };

    const onDraggingChanged = (event) => {
      orbit.enabled = !event.value;

      if (event.value) {
        // drag START — snapshot before the move
        onBeforeDragRef.current = componentsRef.current
          ? [...componentsRef.current]
          : null;
      }

      if (!event.value) {
        const currentId = selectedIdRef.current;
        if (!currentId) return;
        const entry = entryMapRef.current.get(currentId);
        if (!entry) return;

        const updates = compFromWorld(entry.obj, entry.comp);
        if (onBeforeDragRef.current) {
          onPushHistoryRef.current?.(onBeforeDragRef.current); // ← push the pre-drag state
          onBeforeDragRef.current = null;
        }
        onUpdateCompRef.current(currentId, updates);
        entry.obj.scale.set(1, 1, 1);
        storeCameraView();
      }
    };

    const onPointerDown = (e) => {
      if (transform.axis) return;

      const hit = pickMesh(e);

      if (!hit?.object?.userData?.rootId) {
        setSelectedIdRef.current(null);
        setEdit3DIdRef.current(null);
        setSelectedIds([]);
        transform.detach();
        storeCameraView();
        return;
      }

      const hitId = hit.object.userData.rootId;
      const entry = entryMapRef.current.get(hitId);
      if (!entry || isLocked3DRef.current(entry.comp)) return;

      preserveCameraView(() => {
        setSelectedIdRef.current(hitId);
        setSelectedIds([]);
        setEdit3DIdRef.current(hitId);
        transform.attach(entry.obj);
        applyTransformModeRaw();
      });

      storeCameraView();
    };

    const onDoubleClick = (e) => {
      const hit = pickMesh(e);

      if (!hit?.object?.userData?.rootId) {
        setSelectedIdRef.current(null);
        setSelectedIds([]);
        setEdit3DIdRef.current(null);
        transform.detach();
        storeCameraView();
        return;
      }

      const hitId = hit.object.userData.rootId;
      const entry = entryMapRef.current.get(hitId);
      if (!entry || isLocked3DRef.current(entry.comp)) return;

      preserveCameraView(() => {
        setSelectedIdRef.current(hitId);
        setSelectedIds([]);
        setEdit3DIdRef.current(hitId);
        transform.attach(entry.obj);
        applyTransformModeRaw();
      });

      centerOnObject(entry.obj, true);
    };

    const onResize = () => {
      const newW = mount.clientWidth || 1000;
      const newH = mount.clientHeight || 700;
      renderer.setSize(newW, newH);
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      restoreCameraView(cameraViewRef.current);
    };

    const preventContextMenu = (e) => e.preventDefault();

    const onOrbitChange = () => {
      if (!transform.dragging) storeCameraView();
    };

    transform.addEventListener("dragging-changed", onDraggingChanged);
    orbit.addEventListener("change", onOrbitChange);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("dblclick", onDoubleClick);
    renderer.domElement.addEventListener("contextmenu", preventContextMenu);
    window.addEventListener("resize", onResize);

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      orbit.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);

      if (restoreRafRef.current) cancelAnimationFrame(restoreRafRef.current);

      transform.removeEventListener("dragging-changed", onDraggingChanged);
      orbit.removeEventListener("change", onOrbitChange);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("dblclick", onDoubleClick);
      renderer.domElement.removeEventListener(
        "contextmenu",
        preventContextMenu,
      );
      window.removeEventListener("resize", onResize);

      transform.detach();
      transform.dispose();
      orbit.dispose();

      rootGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material))
            obj.material.forEach((m) => m.dispose?.());
          else obj.material.dispose?.();
        }
      });

      renderer.dispose();
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement);
    };
  }, [
    canvasH,
    compFromWorld,
    centerOnObject,
    preserveCameraView,
    restoreCameraView,
    storeCameraView,
    applyTransformModeRaw,
  ]);

  useEffect(() => {
    applyTransformMode();

    const transform = transformRef.current;
    if (!transform) return;

    const currentSelectedId = selectedIdRef.current;
    const currentEdit3DId = edit3DIdRef.current;
    const entry = entryMapRef.current.get(currentSelectedId);

    if (
      entry &&
      currentEdit3DId === currentSelectedId &&
      !isLocked3DRef.current(entry.comp)
    ) {
      preserveCameraView(() => {
        transform.attach(entry.obj);
      });
    }
  }, [transformMode, applyTransformMode, preserveCameraView]);

  useEffect(() => {
    rebuildObjects();
  }, [rebuildObjects]);

  useEffect(() => {
    attachSelected();
  }, [selectedId, edit3DId, attachSelected]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      <Floating3DPalette
        onAdd={addComponent}
        activeBuildLabel={activeBuildLabel}
      />

      <Floating3DInspector
        selectedComp={selectedComp}
        isLocked={isLocked}
        onChange={onUpdateComp}
        unit={unit}
        editorMode={editorMode}
      />

      <ToolSidebar
        transformMode={transformMode}
        setTransformMode={setTransformMode}
        hasSelection={!!selectedComp && editorMode === "editable"}
      />

      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 14,
          background: "rgba(0,0,0,.55)",
          borderRadius: 10,
          padding: "10px 13px",
          fontSize: 11,
          color: "#fff",
          lineHeight: 1.9,
          backdropFilter: "blur(4px)",
          userSelect: "none",
          WebkitUserSelect: "none",
          pointerEvents: "none",
        }}
      >
        <div>
          <span style={{ color: "#ef4444", fontWeight: 700 }}>━</span> X axis —
          Width
        </div>
        <div>
          <span style={{ color: "#22c55e", fontWeight: 700 }}>━</span> Y axis —
          Height
        </div>
        <div>
          <span style={{ color: "#3b82f6", fontWeight: 700 }}>━</span> Z axis —
          Depth
        </div>
        <div style={{ opacity: 0.8 }}>
          Units stay synced: mm base, inch auto-converted.
        </div>
      </div>
    </div>
  );
}

export { ThreeDViewer };
