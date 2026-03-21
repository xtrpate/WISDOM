// BlueprintDesign.jsx — Main component (orchestrates all modules)
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Stage,
  Layer,
  Rect,
  Text,
  Line,
  Arrow,
  Group,
  Circle,
  Image as KonvaImage,
} from "react-konva";
import api from "../../services/api";
import toast from "react-hot-toast";

// ── Data & Types ──────────────────────────────────────────────────────────────
import {
  COMPONENT_LIBRARY_GROUPS,
  VIEWS,
  EXPORT_VIEWS,
  FURNITURE_TEMPLATE_SET,
  QUICK_LIBRARY_COMPONENTS,
  CHAIR_PART_SET,
  CASEWORK_SET,
  TABLE_SET,
  BENCH_SET,
  ROOM_FURNITURE_COMPONENT_TYPES,
  CABINET_COMPONENT_TYPES,
  CHAIR_TEMPLATE_TYPES,
  CHAIR_PART_TYPES,
  WOOD_FINISHES,
} from "./data/furnitureTypes";
import {
  normalizeComponent,
  getComponentsBounds3D,
  get2DBounds,
  getProjectedBox,
  getSelectionGroup,
  isChairPartType,
  applyWoodFinish,
  isWoodLikeMaterial,
  getDefaultFinishId,
  getNextChairOrigin,
  getChairGroupOrigin,
  shouldMirrorView,
  getMirroredBox,
  getNextAssemblyOrigin,
} from "./data/componentUtils";
import {
  snap,
  makeId,
  makeGroupId,
  clamp,
  cloneComponents,
  mmToDisplay,
  displayToMm,
  formatDims,
  getNowStamp,
  resolveAssetUrl,
  isImageReferenceFile,
  getReferenceFileFromBlueprint,
  getEditorMode,
} from "./data/utils";
import {
  resolveInitialComponents,
  useReferenceImage,
} from "./data/initHelpers";
import {
  createDiningTableTemplateComponents,
  createBedTemplateComponents,
  createWardrobeTemplateComponents,
  createCoffeeTableTemplateComponents,
  createDiningChairTemplateComponents,
  buildFurnitureTemplateParts,
  buildDiningChairParts,
  createImportedDiningChairComponents,
} from "./data/templateComponents";

// ── Export / Print ────────────────────────────────────────────────────────────
import {
  buildAllExportPages,
  buildBlueprintDocumentHtml,
} from "./export/exportBuilders";
import {
  getChairManualPlacement,
  getScaledExportItems,
} from "./export/placementHelpers";

// ── 2D Blueprint Rendering ────────────────────────────────────────────────────
import {
  DimensionLine,
  BlueprintTitleBlock,
  BlueprintPaper,
  Canvas2D,
} from "./2d/blueprintComponents";

// ── 3D Viewer ─────────────────────────────────────────────────────────────────
import { ThreeDViewer } from "./3d/threeDViewer";

// ── Styles ────────────────────────────────────────────────────────────────────
import S from "./styles/blueprintStyles";

// ── Constants ─────────────────────────────────────────────────────────────────
const GRID_SIZE = 20;
const BOARD = 18;
const PAPER_MARGIN = 28;
const TITLE_BLOCK_H = 96;
const DRAWING_PADDING = 56;
const MM_PER_INCH = 25.4;
const FLOOR_OFFSET = 40;
const EXPORT_PAGE_W = 1200;
const EXPORT_PAGE_H = 820;
const WORLD_W = 8000;
const WORLD_H = 5000;
const WORLD_D = 8000;

export default function BlueprintDesign() {
  const { id } = useParams();
  const navigate = useNavigate();

  const WORLD_W = 6400;
  const WORLD_H = 3200;
  const WORLD_D = 5200;

  const SHEET_W = 900;
  const SHEET_H = 580;

  const [blueprint, setBlueprint] = useState(null);
  const [components, setComponents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [clipboardObject, setClipboardObject] = useState(null);
  const [edit3DId, setEdit3DId] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("front");
  const [lockedFields, setLockedFields] = useState([]);
  const [transformMode, setTransformMode] = useState("translate");
  const [unit, setUnit] = useState("mm");
  const [activeChairBuild, setActiveChairBuild] = useState(null);
  const [referenceFile, setReferenceFile] = useState(null);
  const [editorMode, setEditorMode] = useState("editable");

  // ── Undo / Redo history ──────────────────────────────────────────────────
  const historyRef = useRef([]); // past snapshots
  const futureRef = useRef([]); // redo snapshots
  const skipHistoryRef = useRef(false); // skip next push (used on undo/redo itself)

  // Call this before any destructive setComponents to record the current state
  const pushHistory = useCallback((snapshot) => {
    if (skipHistoryRef.current) return;
    historyRef.current = [...historyRef.current.slice(-49), snapshot]; // keep last 50
    futureRef.current = [];
  }, []);

  const handleUndo = useCallback(() => {
    if (!historyRef.current.length) {
      toast("Nothing to undo.");
      return;
    }
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    futureRef.current = [components, ...futureRef.current.slice(0, 49)];
    skipHistoryRef.current = true;
    setComponents(prev);
    setSelectedId(null);
    setEdit3DId(null);
    skipHistoryRef.current = false;
    toast.success("Undo");
  }, [components]);

  const handleRedo = useCallback(() => {
    if (!futureRef.current.length) {
      toast("Nothing to redo.");
      return;
    }
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    historyRef.current = [...historyRef.current, components];
    skipHistoryRef.current = true;
    setComponents(next);
    setSelectedId(null);
    setEdit3DId(null);
    skipHistoryRef.current = false;
    toast.success("Redo");
  }, [components]);
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!components.length) {
      if (selectedId) setSelectedId(null);
      if (edit3DId) setEdit3DId(null);
      return;
    }

    if (!selectedId || !components.some((c) => c.id === selectedId)) {
      setSelectedId(components[0].id);
      setEdit3DId(null);
    }
  }, [components, selectedId, edit3DId]);

  useEffect(() => {
    if (!id || id === "new") {
      setReferenceFile(null);
      setEditorMode("editable");
      setView("3d");
      setComponents([]);
      setSelectedId(null);
      setEdit3DId(null);
      return;
    }

    api
      .get(`/blueprints/${id}`)
      .then((r) => {
        setBlueprint(r.data);

        let parsedLockedFields = [];
        let saved = {};

        try {
          parsedLockedFields = JSON.parse(r.data.locked_fields || "[]");
        } catch (err) {
          console.error("Invalid locked_fields JSON:", err);
          parsedLockedFields = [];
        }

        try {
          saved = JSON.parse(r.data.design_data || "{}");
        } catch (err) {
          console.error("Invalid design_data JSON:", err);
          saved = {};
        }

        saved.importDimensions = {
          w: 460,
          h: 920,
          d: 520,
        };

        const refFile = getReferenceFileFromBlueprint(saved, r.data);
        const resolvedMode = getEditorMode(saved, refFile);

        const loadedComponents = resolveInitialComponents(
          saved,
          refFile,
          r.data,
          {
            w: WORLD_W,
            h: WORLD_H,
            d: WORLD_D,
          },
        );

        setLockedFields(
          Array.isArray(parsedLockedFields) ? parsedLockedFields : [],
        );
        setComponents(loadedComponents);
        setSelectedId(loadedComponents[0]?.id || null);
        setEdit3DId(null);
        setUnit(saved.unit || "mm");
        setReferenceFile(refFile);
        setEditorMode(resolvedMode);
        setView(resolvedMode === "reference" ? "front" : "3d");
      })
      .catch(() => toast.error("Failed to load blueprint."));
  }, [id]);

  const selectedComp = components.find((c) => c.id === selectedId) || null;

  const selectedComponents = useMemo(() => {
    return getSelectionGroup(components, selectedComp);
  }, [components, selectedComp]);

  const selectedBounds3D = useMemo(() => {
    return getComponentsBounds3D(selectedComponents);
  }, [selectedComponents]);

  const selectedLabel = useMemo(() => {
    if (!selectedComp) return "";
    return selectedComp.groupLabel || selectedComp.label;
  }, [selectedComp]);

  const selectedMaterialText = useMemo(() => {
    if (!selectedComponents.length) return "—";
    return (
      [
        ...new Set(selectedComponents.map((c) => c.material).filter(Boolean)),
      ].join(", ") || "—"
    );
  }, [selectedComponents]);

  const selectedDimsText = useMemo(() => {
    if (!selectedBounds3D) return "—";
    return formatDims(
      selectedBounds3D.width,
      selectedBounds3D.height,
      selectedBounds3D.depth,
      unit,
    );
  }, [selectedBounds3D, unit]);

  const isLocked = useCallback(
    (comp) =>
      comp?.locked ||
      lockedFields.includes(comp?.type) ||
      lockedFields.includes("all"),
    [lockedFields],
  );

  // ── Copy / Paste ─────────────────────────────────────────────────────────
  const copySelectedObject = useCallback(() => {
    if (!selectedComp) {
      toast.error("Pumili muna ng object sa 3D view.");
      return;
    }
    setClipboardObject(deepClone(selectedComp));
    toast.success(`${selectedComp.label || "Object"} copied.`);
  }, [selectedComp]);

  const pasteCopiedObject = useCallback(() => {
    if (editorMode !== "editable") {
      toast.error("Reference mode ito. Lumipat muna sa editable mode.");
      return;
    }
    if (!clipboardObject) {
      toast.error("Wala pang copied object.");
      return;
    }
    const copied = deepClone(clipboardObject);
    const newId = createObjectId();
    const duplicated = normalizeComponent({
      ...copied,
      id: newId,
      x: Number(copied.x) || 0,
      y: Number(copied.y) || 0,
      z: Number(copied.z) || 0,
      locked: false,
    });
    pushHistory(components);
    setComponents((prev) => [...prev, duplicated]);
    setSelectedId(newId);
    setEdit3DId(newId);
    toast.success(`${duplicated.label || "Object"} pasted.`);
  }, [editorMode, clipboardObject, components, pushHistory]);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Duplicate selected component(s) ─────────────────────────────────────
  const duplicateSelected = useCallback(() => {
    if (editorMode !== "editable") {
      toast.error("Reference mode ito. Lumipat muna sa editable mode.");
      return;
    }
    if (!selectedId) {
      toast("No component selected.");
      return;
    }

    const comp = components.find((c) => c.id === selectedId);
    if (!comp) return;
    if (isLocked(comp)) {
      toast.error("Component is locked.");
      return;
    }

    const OFFSET = 120;

    const toDuplicate = comp.groupId
      ? components.filter((c) => c.groupId === comp.groupId)
      : [comp];

    const newGroupId = comp.groupId ? makeGroupId() : null;
    const groupCount = comp.groupId
      ? [
          ...new Set(
            components
              .filter((c) => c.groupType === comp.groupType)
              .map((c) => c.groupId),
          ),
        ].length + 1
      : null;

    const duplicated = toDuplicate.map((c) =>
      normalizeComponent({
        ...c,
        id: makeId(),
        groupId: newGroupId || null,
        groupLabel: newGroupId
          ? `${c.groupLabel || comp.groupLabel} Copy ${groupCount}`
          : c.groupLabel,
        x: c.x + OFFSET,
        z: c.z + OFFSET,
        locked: false,
      }),
    );

    pushHistory(components);
    setComponents((prev) => [...prev, ...duplicated]);
    setSelectedId(duplicated[0].id);
    setEdit3DId(duplicated[0].id);
    toast.success(
      `Duplicated ${duplicated.length > 1 ? `group (${duplicated.length} parts)` : comp.label}.`,
    );
  }, [editorMode, selectedId, components, isLocked, pushHistory]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || tag === "select";

      if (e.key === "Escape") {
        setSelectedId(null);
        setEdit3DId(null);
        return;
      }

      if (isTyping) return;

      // Ctrl+Z — Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z — Redo
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl+A — Select All
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        if (components.length > 0) {
          setSelectedIds(components.map((c) => c.id));
          setSelectedId(components[0].id);
          toast.success(`All ${components.length} object(s) selected.`);
        }
        return;
      }

      // Ctrl+D — Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      // Ctrl+C — Copy
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        copySelectedObject();
        return;
      }

      // Ctrl+V — Paste
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        pasteCopiedObject();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    selectedId,
    handleUndo,
    handleRedo,
    components,
    duplicateSelected,
    copySelectedObject,
    pasteCopiedObject,
  ]);
  // ─────────────────────────────────────────────────────────────────────────

  const getPlacedGenericComponentData = useCallback(
    (typeDef, placed) => {
      const FLOOR = FLOOR_OFFSET;
      const BASE_MARGIN = 120;
      const GAP_X = 180;
      const GAP_Z = 240;
      const START_X = snap(WORLD_W * 0.36);
      const START_Z = snap(WORLD_D * 0.28);
      const floorY = WORLD_H - FLOOR;

      const generic = placed.filter((c) => !c.groupType);

      const layoutPlaced = (() => {
        let cursorX = START_X;
        let cursorZ = START_Z;
        let rowDepth = 0;
        const rows = [];

        generic.forEach((comp) => {
          if (cursorX + comp.width > WORLD_W - BASE_MARGIN) {
            cursorX = START_X;
            cursorZ += rowDepth + GAP_Z;
            rowDepth = 0;
          }
          rows.push({ x: cursorX, z: cursorZ, comp });
          cursorX += comp.width + GAP_X;
          rowDepth = Math.max(rowDepth, comp.depth);
        });

        return { rows, cursorX, cursorZ, rowDepth };
      })();

      let x = layoutPlaced.cursorX;
      let z = layoutPlaced.cursorZ;
      let rowDepth = layoutPlaced.rowDepth;

      if (x + typeDef.w > WORLD_W - BASE_MARGIN) {
        x = START_X;
        z += rowDepth + GAP_Z;
        rowDepth = 0;
      }

      const cabinetish = generic.filter((c) =>
        [
          "base_cabinet",
          "upper_cabinet",
          "kitchen_cabinet",
          "tv_stand",
          "sideboard",
          "wardrobe",
          "bookshelf",
          "bookcase",
          "dresser",
          "nightstand",
        ].includes(c.type),
      );
      const lastCabinetish = cabinetish[cabinetish.length - 1];

      switch (typeDef.type) {
        case "upper_cabinet":
          return {
            x,
            y: floorY - typeDef.h - 900,
            z,
            width: typeDef.w,
            height: typeDef.h,
            depth: typeDef.d,
            rotationY: 0,
          };

        case "countertop": {
          const host = generic
            .filter((c) =>
              [
                "base_cabinet",
                "kitchen_cabinet",
                "sideboard",
                "tv_stand",
              ].includes(c.type),
            )
            .slice(-1)[0];
          if (host) {
            return {
              x: host.x,
              y: host.y - typeDef.h,
              z: host.z,
              width: Math.max(typeDef.w, host.width),
              height: typeDef.h,
              depth: Math.max(typeDef.d, host.depth),
              rotationY: 0,
            };
          }
          return {
            x,
            y: floorY - typeDef.h - 900,
            z,
            width: typeDef.w,
            height: typeDef.h,
            depth: typeDef.d,
            rotationY: 0,
          };
        }

        case "door_single":
        case "door_double":
        case "shelf":
        case "hardware": {
          const host = lastCabinetish;
          if (host) {
            return {
              x:
                host.x +
                snap(
                  Math.max(
                    0,
                    (host.width - Math.min(typeDef.w, host.width)) / 2,
                  ),
                ),
              y:
                typeDef.type === "shelf"
                  ? host.y + snap(Math.max(40, host.height * 0.3))
                  : host.y +
                    snap(
                      Math.max(
                        0,
                        (host.height - Math.min(typeDef.h, host.height)) / 2,
                      ),
                    ),
              z:
                typeDef.type === "shelf"
                  ? host.z + 20
                  : host.z + Math.max(0, host.depth - typeDef.d),
              width:
                typeDef.type === "hardware"
                  ? typeDef.w
                  : Math.min(typeDef.w, Math.max(typeDef.w, host.width)),
              height:
                typeDef.type === "hardware"
                  ? typeDef.h
                  : Math.min(typeDef.h, host.height),
              depth:
                typeDef.type === "shelf"
                  ? Math.min(typeDef.d, host.depth - 20)
                  : typeDef.d,
              rotationY: host.rotationY || 0,
            };
          }
          return {
            x,
            y: floorY - typeDef.h,
            z,
            width: typeDef.w,
            height: typeDef.h,
            depth: typeDef.d,
            rotationY: 0,
          };
        }

        default:
          return {
            x,
            y: floorY - typeDef.h,
            z,
            width: typeDef.w,
            height: typeDef.h,
            depth: typeDef.d,
            rotationY: 0,
          };
      }
    },
    [WORLD_H, WORLD_W],
  );

  const startManualChairBuild = useCallback(() => {
    const buildCount =
      [
        ...new Set(
          components
            .filter((c) => c.groupType === "chair")
            .map((c) => c.groupId),
        ),
      ].length + 1;
    const groupId = makeGroupId();
    const groupLabel = `Manual Chair ${buildCount}`;
    setActiveChairBuild({ id: groupId, label: groupLabel });
    setView("3d");
    toast.success(`Manual build started: ${groupLabel}`);
  }, [components]);

  const updateComp = useCallback(
    (cid, attrs) => {
      if (editorMode !== "editable") {
        toast.error("Nasa reference mode ka. Lumipat muna sa editable mode.");
        return;
      }
      pushHistory(components);
      setComponents((prev) =>
        prev.map((c) =>
          c.id === cid ? normalizeComponent({ ...c, ...attrs }) : c,
        ),
      );
    },
    [editorMode, components, pushHistory],
  );

  const switchToReferenceMode = useCallback(() => {
    setEditorMode("reference");
    setView(referenceFile?.url ? "front" : "3d");
    toast.success("Reference mode enabled.");
  }, [referenceFile]);

  const switchToEditableMode = useCallback(() => {
    setEditorMode("editable");
    setView("3d");

    setComponents((prev) => {
      const normalizedPrev = Array.isArray(prev)
        ? prev.map(normalizeComponent)
        : [];
      const hasRealComponents =
        normalizedPrev.length > 0 &&
        normalizedPrev.some((c) => c.type !== "reference_proxy");

      if (hasRealComponents) {
        return normalizedPrev;
      }

      if (referenceFile?.url) {
        return createImportedDiningChairComponents(
          {},
          referenceFile,
          blueprint || {},
          { w: WORLD_W, h: WORLD_H, d: WORLD_D },
        );
      }

      return normalizedPrev;
    });

    toast.success("Editable mode enabled.");
  }, [referenceFile, blueprint, WORLD_W, WORLD_H, WORLD_D]);

  const addComponent = useCallback(
    (t) => {
      if (editorMode !== "editable") {
        toast.error(
          'Reference mode ito. Click "Editable Mode" muna bago mag-add ng components.',
        );
        return;
      }
      if (view !== "3d") {
        toast.error("Sa 3D view lang puwede mag-add ng component.");
        return;
      }

      const defaultFinishId = getDefaultFinishId(t.material);
      const finishData = defaultFinishId
        ? applyWoodFinish({}, defaultFinishId)
        : {};

      if (FURNITURE_TEMPLATE_SET.has(t.type)) {
        const { x, z } = getNextAssemblyOrigin(components);

        const buildCount =
          [
            ...new Set(
              components
                .filter((c) => c.groupType === "assembly")
                .map((c) => c.groupId),
            ),
          ].length + 1;

        const groupId = makeGroupId();
        const groupLabel = `${t.label} ${buildCount}`;

        const parts = buildFurnitureTemplateParts({
          templateType: t.type,
          buildId: groupId,
          originX: x,
          originZ: z,
          canvasH: WORLD_H,
          groupLabel,
        });
        pushHistory(components);
        setComponents((prev) => [...prev, ...parts]);
        setSelectedId(parts[0]?.id || null);
        setEdit3DId(parts[0]?.id || null);
        setTransformMode("translate");
        toast.success(`${t.label} added.`);
        return;
      }

      if (t.type === "chair_template") {
        const { x, z } = getNextChairOrigin(components);
        const chairCount =
          [
            ...new Set(
              components
                .filter((c) => c.groupType === "chair")
                .map((c) => c.groupId),
            ),
          ].length + 1;
        const groupId = makeGroupId();
        const groupLabel = `Dining Chair ${chairCount}`;
        const builtChair = buildDiningChairParts({
          buildId: groupId,
          originX: x,
          originZ: z,
          canvasH: WORLD_H,
          groupLabel,
        });

        const parts = builtChair.parts;
        pushHistory(components);
        setComponents((prev) => [...prev, ...parts]);
        setSelectedId(parts[0]?.id || null);
        setEdit3DId(parts[0]?.id || null);
        setTransformMode("translate");
        setActiveChairBuild({ id: groupId, label: groupLabel });
        toast.success("Dining chair template generated.");
        return;
      }

      if (isChairPartType(t.type)) {
        const selectedChairGroup =
          selectedComp?.groupType === "chair" && selectedComp.groupId
            ? {
                id: selectedComp.groupId,
                label: selectedComp.groupLabel || "Chair Build",
              }
            : null;

        const targetBuild =
          activeChairBuild ||
          selectedChairGroup ||
          (() => {
            const chairCount =
              [
                ...new Set(
                  components
                    .filter((c) => c.groupType === "chair")
                    .map((c) => c.groupId),
                ),
              ].length + 1;
            return { id: makeGroupId(), label: `Manual Chair ${chairCount}` };
          })();

        const groupComponents = components.filter(
          (c) => c.groupId === targetBuild.id,
        );
        const placement = getChairManualPlacement(
          t,
          groupComponents,
          components,
          WORLD_H,
        );

        const newComp = normalizeComponent({
          id: makeId(),
          groupId: targetBuild.id,
          groupLabel: targetBuild.label,
          groupType: "chair",
          type: t.type,
          label: placement.label,
          partCode: placement.partCode,
          category: t.category,
          blueprintStyle: "chair_part",
          x: placement.x,
          y: placement.y,
          z: placement.z,
          width: placement.width,
          height: placement.height,
          depth: placement.depth,
          rotationY: 0,
          fill: finishData.fill || t.fill,
          material: finishData.material || t.material,
          finish: finishData.finish || "",
          unitPrice: t.unitPrice,
          qty: 1,
          locked: false,
        });
        pushHistory(components);
        setComponents((prev) => [...prev, newComp]);
        setSelectedId(newComp.id);
        setEdit3DId(newComp.id);
        setTransformMode("translate");
        setActiveChairBuild(targetBuild);
        toast.success(`${newComp.label} added.`);
        return;
      }

      if (t.type === "dining_chair") {
        const placement = getPlacedGenericComponentData(t, components);
        const newComp = normalizeComponent({
          id: makeId(),
          type: t.type,
          label: t.label,
          category: t.category,
          blueprintStyle: t.blueprintStyle,
          x: placement.x,
          y: placement.y,
          z: placement.z,
          width: t.w,
          height: t.h,
          depth: t.d,
          rotationY: 0,
          fill: finishData.fill || t.fill,
          material: finishData.material || t.material,
          finish: finishData.finish || "",
          unitPrice: t.unitPrice,
          qty: 1,
          locked: false,
        });
        pushHistory(components);
        setComponents((prev) => [...prev, newComp]);
        setSelectedId(newComp.id);
        setEdit3DId(newComp.id);
        setTransformMode("translate");
        toast.success("Dining chair added.");
        return;
      }

      const placement = getPlacedGenericComponentData(t, components);

      const newComp = normalizeComponent({
        id: makeId(),
        type: t.type,
        label: t.label,
        category: t.category,
        blueprintStyle: t.blueprintStyle,
        x: placement.x,
        y: placement.y,
        z: placement.z,
        width: placement.width || t.w,
        height: placement.height || t.h,
        depth: placement.depth || t.d,
        rotationY: placement.rotationY || 0,
        fill: finishData.fill || t.fill,
        material: finishData.material || t.material,
        finish: finishData.finish || "",
        unitPrice: t.unitPrice,
        qty: 1,
        locked: false,
      });
      pushHistory(components);
      setComponents((prev) => [...prev, newComp]);
      setSelectedId(newComp.id);
      setEdit3DId(newComp.id);
      setTransformMode("translate");
      toast.success("Component added in 3D.");
    },
    [
      view,
      editorMode,
      components,
      selectedComp,
      activeChairBuild,
      WORLD_H,
      getPlacedGenericComponentData,
    ],
  );

  const autoArrangeComponents = useCallback(() => {
    if (editorMode !== "editable") {
      toast.error("Reference mode ito. Lumipat muna sa editable mode.");
      return;
    }

    setComponents((prev) => {
      const generic = prev.filter((c) => !c.groupType);
      const grouped = prev.filter((c) => c.groupType);

      const arrangedGeneric = [];
      for (const comp of generic) {
        const typeDef = QUICK_LIBRARY_COMPONENTS.find(
          (t) => t.type === comp.type,
        ) || {
          type: comp.type,
          label: comp.label,
          category: comp.category,
          blueprintStyle: comp.blueprintStyle,
          w: comp.width,
          h: comp.height,
          d: comp.depth,
          fill: comp.fill,
          material: comp.material,
          unitPrice: comp.unitPrice,
        };

        const placement = getPlacedGenericComponentData(
          {
            ...typeDef,
            w: comp.width,
            h: comp.height,
            d: comp.depth,
          },
          arrangedGeneric,
        );

        arrangedGeneric.push(
          normalizeComponent({ ...comp, ...placement, rotationY: 0 }),
        );
      }

      return [...grouped, ...arrangedGeneric];
    });

    setSelectedId(null);
    setEdit3DId(null);
    toast.success("Furniture and generic components auto-arranged.");
  }, [editorMode, getPlacedGenericComponentData]);

  const removeSelected = () => {
    if (editorMode !== "editable") {
      toast.error(
        "Reference mode ito. Walang editable components na puwedeng burahin.",
      );
      return;
    }

    const comp = components.find((c) => c.id === selectedId);
    if (!comp) return;

    if (isLocked(comp)) {
      toast.error("Component is locked.");
      return;
    }

    setComponents((prev) => prev.filter((c) => c.id !== selectedId));
    setSelectedId(null);
    setEdit3DId(null);
  };

  const saveDesign = async () => {
    if (!id || id === "new") {
      toast.error(
        "Create the blueprint record first before saving the design.",
      );
      return;
    }

    setSaving(true);
    try {
      await api.put(`/blueprints/${id}`, {
        design_data: JSON.stringify({
          unit,
          editorMode,
          components,
          reference_file: referenceFile,
          importDimensions: {
            w: 460,
            h: 920,
            d: 520,
          },
          worldSize: { w: WORLD_W, h: WORLD_H, d: WORLD_D },
          sheetSize: { w: SHEET_W, h: SHEET_H },
          exportViews: EXPORT_VIEWS,
        }),
      });
      toast.success("Blueprint saved.");
    } catch {
      toast.error("Save failed. Check server connection.");
    } finally {
      setSaving(false);
    }
  };

  const exportTargetComponents = useMemo(() => {
    return selectedComp ? selectedComponents : components;
  }, [selectedComp, selectedComponents, components]);

  const exportTargetBounds = useMemo(() => {
    return getComponentsBounds3D(exportTargetComponents);
  }, [exportTargetComponents]);

  const exportTargetLabel = useMemo(() => {
    if (selectedComp) return selectedLabel;
    return blueprint?.title || "Full Blueprint Layout";
  }, [selectedComp, selectedLabel, blueprint]);

  const exportTargetMaterials = useMemo(() => {
    if (!exportTargetComponents.length) return "—";
    return (
      [
        ...new Set(
          exportTargetComponents.map((c) => c.material).filter(Boolean),
        ),
      ].join(", ") || "—"
    );
  }, [exportTargetComponents]);

  const exportTargetDims = useMemo(() => {
    if (!exportTargetBounds) return "—";
    return formatDims(
      exportTargetBounds.width,
      exportTargetBounds.height,
      exportTargetBounds.depth,
      unit,
    );
  }, [exportTargetBounds, unit]);

  const openReferenceFile = useCallback(() => {
    if (!referenceFile?.url) {
      toast.error("No reference file available.");
      return;
    }

    window.open(
      resolveAssetUrl(referenceFile.url),
      "_blank",
      "noopener,noreferrer",
    );
  }, [referenceFile]);

  const openExportSheets = useCallback(
    (autoPrint = false) => {
      if (!exportTargetComponents.length) {
        toast.error("Walang component na mae-export.");
        return;
      }

      const pages = buildAllExportPages({
        exportComponents: exportTargetComponents,
        selectedComp: selectedComp || exportTargetComponents[0],
        selectedLabel: exportTargetLabel,
        selectedMaterialText: exportTargetMaterials,
        selectedBounds3D: exportTargetBounds,
        selectedDimsText: exportTargetDims,
        blueprintTitle: blueprint?.title || "Blueprint Design",
        unit,
      });

      const html = buildBlueprintDocumentHtml(pages);
      const opened = openBlueprintWindow(html, autoPrint);

      if (!opened) return;

      if (!autoPrint) {
        toast.success("Export sheets opened.");
      }
    },
    [
      exportTargetComponents,
      selectedComp,
      exportTargetLabel,
      exportTargetMaterials,
      exportTargetBounds,
      exportTargetDims,
      blueprint,
      unit,
    ],
  );

  const designTotal = useMemo(() => {
    return components.reduce(
      (sum, c) => sum + Number(c.qty || 1) * Number(c.unitPrice || 0),
      0,
    );
  }, [components]);

  const uniqueMaterials = useMemo(() => {
    return [...new Set(components.map((c) => c.material).filter(Boolean))];
  }, [components]);

  const selectedGroupParts = useMemo(() => {
    if (!selectedComponents.length || selectedComponents.length === 1)
      return [];
    return [...selectedComponents].sort((a, b) => {
      if ((a.partCode || "") < (b.partCode || "")) return -1;
      if ((a.partCode || "") > (b.partCode || "")) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [selectedComponents]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
        background: "#0f172a",
      }}
    >
      <div
        style={{
          background: "#1e2a38",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          borderBottom: "2px solid #334155",
        }}
      >
        <button onClick={() => navigate("/blueprints")} style={S.toolBtn}>
          ← Back
        </button>

        <span style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0" }}>
          {blueprint?.title || "Blueprint Design"}
        </span>

        {blueprint && (
          <span
            style={{
              fontSize: 11,
              background: "#2d4a6e",
              padding: "2px 10px",
              borderRadius: 20,
              color: "#93c5fd",
            }}
          >
            Stage: {blueprint.stage}
          </span>
        )}

        {activeChairBuild?.label && (
          <span style={S.smallPill}>
            Active Chair Build: {activeChairBuild.label}
          </span>
        )}

        <div
          style={{
            display: "flex",
            gap: 3,
            marginLeft: 16,
            background: "#0f172a",
            borderRadius: 8,
            padding: 3,
          }}
        >
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              style={{
                ...S.toolBtn,
                background: view === v.key ? "#3b82f6" : "transparent",
                fontWeight: view === v.key ? 700 : 400,
                padding: "4px 14px",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 3,
            background: "#0f172a",
            borderRadius: 8,
            padding: 3,
          }}
        >
          {["mm", "inch"].map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              style={{
                ...S.toolBtn,
                background: unit === u ? "#14b8a6" : "transparent",
                fontWeight: unit === u ? 700 : 400,
                padding: "4px 12px",
              }}
            >
              {u.toUpperCase()}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 3,
            background: "#0f172a",
            borderRadius: 8,
            padding: 3,
          }}
        >
          {["reference", "editable"].map((mode) => (
            <button
              key={mode}
              onClick={() => {
                if (mode === "reference") switchToReferenceMode();
                else switchToEditableMode();
              }}
              style={{
                ...S.toolBtn,
                background: editorMode === mode ? "#f59e0b" : "transparent",
                fontWeight: editorMode === mode ? 700 : 400,
                padding: "4px 12px",
              }}
            >
              {mode === "reference" ? "Reference Mode" : "Editable Mode"}
            </button>
          ))}
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {view !== "3d" && (
            <button onClick={() => setShowGrid((g) => !g)} style={S.toolBtn}>
              {showGrid ? "⊞ Hide Grid" : "⊞ Grid"}
            </button>
          )}

          <button
            onClick={autoArrangeComponents}
            style={{ ...S.toolBtn, background: "#7c3aed" }}
          >
            🧩 Auto Arrange
          </button>

          <button
            onClick={handleUndo}
            title="Undo (Ctrl+Z)"
            disabled={!historyRef.current?.length}
            style={{
              ...S.toolBtn,
              background: "#334155",
              opacity: !historyRef.current?.length ? 0.4 : 1,
            }}
          >
            ↩ Undo
          </button>

          <button
            onClick={handleRedo}
            title="Redo (Ctrl+Y)"
            disabled={!futureRef.current?.length}
            style={{
              ...S.toolBtn,
              background: "#334155",
              opacity: !futureRef.current?.length ? 0.4 : 1,
            }}
          >
            ↪ Redo
          </button>

          <button
            onClick={duplicateSelected}
            disabled={!selectedId}
            title="Duplicate (Ctrl+D)"
            style={{
              ...S.toolBtn,
              background: "#0369a1",
              opacity: !selectedId ? 0.4 : 1,
            }}
          >
            ⧉ Duplicate
          </button>

          <button
            onClick={copySelectedObject}
            disabled={!selectedComp}
            title="Copy (Ctrl+C)"
            style={{
              ...S.toolBtn,
              background: "#0369a1",
              opacity: selectedComp ? 1 : 0.4,
            }}
          >
            📋 Copy
          </button>

          <button
            onClick={pasteCopiedObject}
            disabled={!clipboardObject || editorMode !== "editable"}
            title="Paste (Ctrl+V)"
            style={{
              ...S.toolBtn,
              background: "#4338ca",
              opacity: clipboardObject && editorMode === "editable" ? 1 : 0.4,
            }}
          >
            📑 Paste
          </button>

          <button
            onClick={removeSelected}
            disabled={!selectedId}
            style={{
              ...S.toolBtn,
              background: "#7f1d1d",
              opacity: !selectedId ? 0.4 : 1,
            }}
          >
            🗑 Delete
          </button>

          {referenceFile && (
            <button
              onClick={openReferenceFile}
              style={{ ...S.toolBtn, background: "#475569" }}
            >
              📎 Open Reference
            </button>
          )}

          <button
            onClick={() => openExportSheets(false)}
            style={{ ...S.toolBtn, background: "#0f766e" }}
          >
            📄 Export Sheets
          </button>

          <button
            onClick={() => openExportSheets(true)}
            style={{ ...S.toolBtn, background: "#1d4ed8" }}
          >
            🖨 Print Sheets
          </button>

          <button
            onClick={saveDesign}
            disabled={saving}
            style={{ ...S.toolBtn, background: "#065f46" }}
          >
            {saving ? "Saving…" : "💾 Save"}
          </button>

          <button
            onClick={() => navigate(`/blueprints/${id}/estimation`)}
            style={{ ...S.toolBtn, background: "#4c1d95" }}
          >
            💰 Estimate
          </button>
        </div>
      </div>

      {view === "3d" ? (
        <div style={{ flex: 1, minHeight: 0 }}>
          <div
            style={{
              padding: "5px 14px",
              background: "#1e293b",
              borderBottom: "1px solid #334155",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "#93c5fd" }}>
              3D View
            </span>
            <span style={{ fontSize: 11, color: "#475569" }}>
              furniture library + chair tools · {components.length} object
              {components.length !== 1 ? "s" : ""}
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              Export target:{" "}
              {selectedComp
                ? `${selectedLabel} (${selectedComponents.length} parts)`
                : "Entire blueprint"}
            </span>
          </div>

          <div style={{ width: "100%", height: "100%" }}>
            <ThreeDViewer
              components={components}
              selectedId={selectedId}
              edit3DId={edit3DId}
              setSelectedId={setSelectedId}
              setEdit3DId={setEdit3DId}
              onUpdateComp={updateComp}
              lockedFields={lockedFields}
              canvasW={WORLD_W}
              canvasH={WORLD_H}
              canvasD={WORLD_D}
              transformMode={transformMode}
              setTransformMode={setTransformMode}
              addComponent={addComponent}
              activeBuildLabel={activeChairBuild?.label || ""}
              selectedComp={selectedComp}
              isLocked={isLocked}
              unit={unit}
              editorMode={editorMode}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              onPushHistory={pushHistory}
            />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div
            style={{
              flex: 1,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "5px 14px",
                background: "#1e293b",
                borderBottom: "1px solid #334155",
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "#93c5fd" }}>
                {VIEWS.find((v) => v.key === view)?.label}
              </span>

              <span style={{ fontSize: 11, color: "#475569" }}>
                {selectedComp
                  ? `${selectedLabel} · ${selectedComponents.length} part${selectedComponents.length !== 1 ? "s" : ""}`
                  : "No selected object from 3D"}
              </span>
            </div>

            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                overflow: "auto",
                background: "#cbd5e1",
              }}
            >
              <div
                style={{
                  background: "#fff",
                  boxShadow: "0 8px 40px rgba(0,0,0,.35)",
                  display: "inline-block",
                }}
              >
                <Canvas2D
                  selectedComp={selectedComp}
                  selectedComponents={selectedComponents}
                  allComponents={components}
                  selectedLabel={selectedLabel}
                  selectedMaterialText={selectedMaterialText}
                  selectedDimsText={selectedDimsText}
                  selectedBounds3D={selectedBounds3D}
                  view={view}
                  canvasW={SHEET_W}
                  canvasH={SHEET_H}
                  showGrid={showGrid}
                  blueprintTitle={blueprint?.title || "Blueprint Design"}
                  unit={unit}
                  referenceFile={referenceFile}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              width: 320,
              background: "#1e293b",
              borderLeft: "1px solid #334155",
              padding: 10,
              overflowY: "auto",
              flexShrink: 0,
            }}
          >
            <p style={S.panelLabel}>Selected from 3D</p>

            {!selectedComp ? (
              <div
                style={{
                  background: "#0f172a",
                  border: "1px dashed #334155",
                  borderRadius: 8,
                  padding: 12,
                  color: "#64748b",
                  fontSize: 11,
                  lineHeight: 1.8,
                }}
              >
                Pumili muna ng furniture o part sa 3D view.
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: "8px 8px",
                    borderRadius: 6,
                    marginBottom: 10,
                    fontSize: 11,
                    background: "#0f172a",
                    color: "#cbd5e1",
                    border: "1px solid #334155",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        background: selectedComp.fill,
                        borderRadius: 2,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1 }}>
                      {selectedComp.partCode
                        ? `${selectedComp.partCode} — ${selectedComp.label}`
                        : selectedComp.label}
                    </span>
                    {isLocked(selectedComp) && <span>🔒</span>}
                  </div>

                  <div style={{ marginTop: 4, fontSize: 10, opacity: 0.92 }}>
                    Group: {selectedComp.groupLabel || "—"}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.92 }}>
                    {formatDims(
                      selectedComp.width,
                      selectedComp.height,
                      selectedComp.depth,
                      unit,
                    )}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.85 }}>
                    Rot Y: {selectedComp.rotationY || 0}°
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.85 }}>
                    {selectedComp.material || "—"}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.85 }}>
                    Category: {selectedComp.category || "—"}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.95 }}>
                    ₱{" "}
                    {(
                      Number(selectedComp.qty || 1) *
                      Number(selectedComp.unitPrice || 0)
                    ).toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: 7 }}>
                  <label style={S.propLabel}>
                    Width ({unit === "inch" ? "in" : "mm"})
                  </label>
                  <input
                    type="number"
                    step={unit === "inch" ? "0.01" : "1"}
                    value={mmToDisplay(selectedComp.width ?? 0, unit)}
                    disabled={
                      editorMode !== "editable" || isLocked(selectedComp)
                    }
                    onChange={(e) =>
                      updateComp(selectedComp.id, {
                        width: displayToMm(e.target.value, unit),
                      })
                    }
                    style={S.propInput}
                  />
                </div>

                <div style={{ marginBottom: 7 }}>
                  <label style={S.propLabel}>
                    Height ({unit === "inch" ? "in" : "mm"})
                  </label>
                  <input
                    type="number"
                    step={unit === "inch" ? "0.01" : "1"}
                    value={mmToDisplay(selectedComp.height ?? 0, unit)}
                    disabled={
                      editorMode !== "editable" || isLocked(selectedComp)
                    }
                    onChange={(e) =>
                      updateComp(selectedComp.id, {
                        height: displayToMm(e.target.value, unit),
                      })
                    }
                    style={S.propInput}
                  />
                </div>

                <div style={{ marginBottom: 7 }}>
                  <label style={S.propLabel}>
                    Depth ({unit === "inch" ? "in" : "mm"})
                  </label>
                  <input
                    type="number"
                    step={unit === "inch" ? "0.01" : "1"}
                    value={mmToDisplay(selectedComp.depth ?? 0, unit)}
                    disabled={
                      editorMode !== "editable" || isLocked(selectedComp)
                    }
                    onChange={(e) =>
                      updateComp(selectedComp.id, {
                        depth: displayToMm(e.target.value, unit),
                      })
                    }
                    style={S.propInput}
                  />
                </div>

                <div style={{ marginBottom: 7 }}>
                  <label style={S.propLabel}>Fill Color</label>
                  <input
                    type="color"
                    value={selectedComp.fill || "#d9c2a5"}
                    disabled={
                      editorMode !== "editable" || isLocked(selectedComp)
                    }
                    onChange={(e) =>
                      updateComp(selectedComp.id, {
                        fill: e.target.value,
                        finish: "",
                      })
                    }
                    style={{
                      ...S.propInput,
                      padding: 2,
                      height: 36,
                    }}
                  />
                </div>

                {(isWoodLikeMaterial(selectedComp.material) ||
                  selectedComp.finish !== undefined) && (
                  <div style={{ marginBottom: 7 }}>
                    <label style={S.propLabel}>Wood Finish</label>
                    <select
                      value={selectedComp.finish ?? ""}
                      disabled={
                        editorMode !== "editable" || isLocked(selectedComp)
                      }
                      onChange={(e) =>
                        updateComp(
                          selectedComp.id,
                          applyWoodFinish(selectedComp, e.target.value),
                        )
                      }
                      style={S.propInput}
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
              </>
            )}

            {/* Corner Radius — available for ALL objects */}
            {selectedComp && (
              <div style={{ marginBottom: 7 }}>
                <label style={S.propLabel}>
                  Corner Radius (mm) — {selectedComp.cornerRadius ?? 0}mm
                </label>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="5"
                  value={selectedComp.cornerRadius ?? 0}
                  disabled={editorMode !== "editable" || isLocked(selectedComp)}
                  onChange={(e) =>
                    updateComp(selectedComp.id, {
                      cornerRadius: Number(e.target.value),
                    })
                  }
                  style={{
                    width: "100%",
                    accentColor: "#3b82f6",
                    marginBottom: 4,
                  }}
                />
                <input
                  type="number"
                  min="0"
                  max="500"
                  step="5"
                  value={selectedComp.cornerRadius ?? 0}
                  disabled={editorMode !== "editable" || isLocked(selectedComp)}
                  onChange={(e) =>
                    updateComp(selectedComp.id, {
                      cornerRadius: Math.max(
                        0,
                        Math.min(500, Number(e.target.value) || 0),
                      ),
                    })
                  }
                  style={S.propInput}
                />
              </div>
            )}

            {/* Top Width Ratio — trapezoid only */}
            {selectedComp && selectedComp.type === "shape_trapezoid" && (
              <div style={{ marginBottom: 7 }}>
                <label style={S.propLabel}>
                  Top Width Ratio —{" "}
                  {Math.round((selectedComp.topRatio ?? 0.5) * 100)}%
                </label>
                <input
                  type="range"
                  min="5"
                  max="98"
                  step="1"
                  value={Math.round((selectedComp.topRatio ?? 0.5) * 100)}
                  disabled={editorMode !== "editable" || isLocked(selectedComp)}
                  onChange={(e) =>
                    updateComp(selectedComp.id, {
                      topRatio: Number(e.target.value) / 100,
                    })
                  }
                  style={{
                    width: "100%",
                    accentColor: "#f59e0b",
                    marginBottom: 4,
                  }}
                />
              </div>
            )}

            {selectedBounds3D && (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: "1px solid #334155",
                }}
              >
                <p style={S.panelLabel}>Selected Group Summary</p>
                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: 10,
                    color: "#cbd5e1",
                    fontSize: 11,
                    lineHeight: 1.9,
                  }}
                >
                  <div>Label: {selectedLabel}</div>
                  <div>Parts: {selectedComponents.length}</div>
                  <div>Overall: {selectedDimsText}</div>
                  <div>Material: {selectedMaterialText}</div>
                </div>
              </div>
            )}

            {selectedGroupParts.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={S.panelLabel}>Parts List</p>
                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: 10,
                    color: "#cbd5e1",
                    fontSize: 10,
                    lineHeight: 1.8,
                  }}
                >
                  {selectedGroupParts.map((p) => (
                    <div key={p.id}>
                      • {p.partCode || "PART"} — {p.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px solid #334155",
              }}
            >
              <p style={S.panelLabel}>Export / Print Target</p>
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: 10,
                  color: "#cbd5e1",
                  fontSize: 11,
                  lineHeight: 1.9,
                }}
              >
                <div>
                  Target:{" "}
                  {selectedComp ? selectedLabel : "Entire blueprint layout"}
                </div>
                <div>Objects / Parts: {exportTargetComponents.length}</div>
                <div>Dims: {exportTargetDims}</div>
                <div>Materials: {exportTargetMaterials}</div>
              </div>

              <button
                onClick={() => openExportSheets(false)}
                style={{
                  ...S.toolBtn,
                  width: "100%",
                  marginTop: 8,
                  background: "#0f766e",
                }}
              >
                📄 Open Export Sheets
              </button>
              <button
                onClick={() => openExportSheets(true)}
                style={{
                  ...S.toolBtn,
                  width: "100%",
                  marginTop: 8,
                  background: "#1d4ed8",
                }}
              >
                🖨 Print Blueprint Sheets
              </button>
            </div>

            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px solid #334155",
              }}
            >
              <p style={S.panelLabel}>Summary</p>
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: 10,
                  color: "#cbd5e1",
                  fontSize: 11,
                  lineHeight: 1.9,
                }}
              >
                <div>Components: {components.length}</div>
                <div>Materials: {uniqueMaterials.length}</div>
                <div>
                  Total Estimate: ₱{" "}
                  {designTotal.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>

              {uniqueMaterials.length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: 10,
                    color: "#cbd5e1",
                    fontSize: 10,
                    lineHeight: 1.8,
                  }}
                >
                  <div style={{ color: "#94a3b8", marginBottom: 4 }}>
                    Materials Used
                  </div>
                  {uniqueMaterials.map((m) => (
                    <div key={m}>• {m}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
