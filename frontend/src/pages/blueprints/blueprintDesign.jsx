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
  createEmptyReferenceFiles,
  getReferenceFilesFromBlueprint,
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
  createImportedFurnitureComponents,
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

const DEFAULT_IMPORT_TEMPLATE_TYPE = "template_closet_wardrobe";
const DEFAULT_IMPORT_DIMENSIONS = { w: 2400, h: 2400, d: 600 };

const DEFAULT_AI3D_STATE = {
  status: "idle",
  provider: "meshy",
  providerStatus: "",
  taskId: "",
  modelUrl: "",
  previewUrl: "",
  format: "glb",
  progress: 0,
  sourceImageUrl: "",
  errorMessage: "",
  requestedAt: "",
  finishedAt: "",
  lastCheckedAt: "",
};

const AI3D_STATUS_LABELS = {
  idle: "Idle",
  queued: "Queued",
  processing: "Processing",
  done: "Ready",
  error: "Error",
};
const TRACE_TYPE_OPTIONS = [
  { value: "drawer", label: "Drawer Section" },
  { value: "door", label: "Door Section" },
  { value: "body", label: "Body Only" },
];

const TRACE_TYPE_LABELS = {
  drawer: "Drawer Section",
  door: "Door Section",
  body: "Body Only",
};

const REFERENCE_TRACE_VIEWS = ["front", "back", "left", "right", "top"];

function createEmptyReferenceCalibrationByView() {
  return REFERENCE_TRACE_VIEWS.reduce((acc, viewKey) => {
    acc[viewKey] = normalizeReferenceCalibration();
    return acc;
  }, {});
}

function createEmptyTraceObjectsByView() {
  return REFERENCE_TRACE_VIEWS.reduce((acc, viewKey) => {
    acc[viewKey] = [];
    return acc;
  }, {});
}

function normalizeReferenceCalibrationByView(value = {}) {
  const next = createEmptyReferenceCalibrationByView();

  const hasViewMap =
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    REFERENCE_TRACE_VIEWS.some((viewKey) => value?.[viewKey]);

  if (hasViewMap) {
    REFERENCE_TRACE_VIEWS.forEach((viewKey) => {
      next[viewKey] = normalizeReferenceCalibration(value?.[viewKey]);
    });
    return next;
  }

  next.front = normalizeReferenceCalibration(value);
  return next;
}

function normalizeTraceObjectsByView(value = {}) {
  const next = createEmptyTraceObjectsByView();

  if (Array.isArray(value)) {
    value.forEach((item) => {
      const viewKey = normalizeTraceView(
        item?.view || item?.traceView || item?.projectionView || "front",
      );
      next[viewKey].push(normalizeTraceObject(item, viewKey));
    });
    return next;
  }

  REFERENCE_TRACE_VIEWS.forEach((viewKey) => {
    next[viewKey] = normalizeTraceObjects(value?.[viewKey], viewKey);
  });

  return next;
}

function flattenTraceObjectsByView(value = {}) {
  return REFERENCE_TRACE_VIEWS.flatMap((viewKey) =>
    normalizeTraceObjects(value?.[viewKey], viewKey),
  );
}


function normalizeAi3dState(value = {}) {
  const next =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return {
    ...DEFAULT_AI3D_STATE,
    ...next,
  };
}

function normalizeReferenceCalibration(value = {}) {
  const rawPoints = Array.isArray(value?.points) ? value.points.slice(0, 2) : [];

  const points = rawPoints
    .map((point) => ({
      x: Number(point?.x) || 0,
      y: Number(point?.y) || 0,
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  const realDistanceMm = Math.max(0, Number(value?.realDistanceMm) || 0);
  const pixelsPerMm = Math.max(0, Number(value?.pixelsPerMm) || 0);

  return {
    points,
    realDistanceMm,
    pixelsPerMm,
    isCalibrated:
      points.length === 2 &&
      realDistanceMm > 0 &&
      pixelsPerMm > 0 &&
      Boolean(value?.isCalibrated),
  };
}

function normalizeTraceView(rawView = "front") {
  const value = String(rawView || "front").toLowerCase();

  if (value === "back") return "back";
  if (value === "left") return "left";
  if (value === "right") return "right";
  if (value === "top") return "top";
  return "front";
}

function normalizeProjectionView(rawView = "front") {
  const value = normalizeTraceView(rawView);

  if (value === "back") return "front";
  if (value === "right") return "left";
  return value;
}

function normalizeTraceObject(obj = {}, fallbackView = "front") {
  const view = normalizeTraceView(
    obj?.view || obj?.traceView || obj?.projectionView || fallbackView,
  );

  const type = ["drawer", "door", "body"].includes(obj?.type)
    ? obj.type
    : ["drawer", "door", "body"].includes(obj?.traceType)
      ? obj.traceType
      : "door";

  const width = Math.max(GRID_SIZE, snap(Number(obj?.width) || 0));
  const height = Math.max(GRID_SIZE, snap(Number(obj?.height) || 0));

  return {
    id: obj?.id || makeId(),
    type,
    traceType: type,
    label: obj?.label || TRACE_TYPE_LABELS[type] || "Trace Object",
    x: snap(Number(obj?.x) || 0),
    y: snap(Number(obj?.y) || 0),
    width,
    height,
    view,
    traceView: view,
    projectionView: normalizeProjectionView(view),
  };
}

function normalizeTraceObjects(list = [], fallbackView = "front") {
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => normalizeTraceObject(item, fallbackView))
    .filter((item) => item.width > 0 && item.height > 0);
}

function sanitizeReferenceFile(file) {
  if (!file?.url) return null;

  const type = String(file?.type || file?.file_type || "")
    .trim()
    .toLowerCase();

  if (!type) return null;

  return {
    url: file.url,
    type,
    name: file.name || "Reference File",
    source: file.source || "imported",
  };
}
function isLikelyChairReference({
  importTemplateType,
  importDimensions,
  traceObjectsByView,
}) {
  const dims = {
    w: Number(importDimensions?.w) || 0,
    h: Number(importDimensions?.h) || 0,
    d: Number(importDimensions?.d) || 0,
  };

  const perViewCounts = REFERENCE_TRACE_VIEWS.map(
    (viewKey) => (traceObjectsByView?.[viewKey] || []).length,
  );

  const hasSingleOutlinePerView = perViewCounts.every((count) => count === 1);

  const compactChairSized =
    dims.w > 0 &&
    dims.h > 0 &&
    dims.d > 0 &&
    dims.w <= 1100 &&
    dims.h <= 1400 &&
    dims.d <= 1100;

  const explicitChairTemplate = [
    "chair_template",
    "template_dining_chair",
    "template_accent_chair",
    "template_lounge_chair",
  ].includes(importTemplateType);

  return explicitChairTemplate || (compactChairSized && hasSingleOutlinePerView);
}

function sanitizeReferenceFiles(files = {}) {
  return {
    front: sanitizeReferenceFile(files?.front),
    back: sanitizeReferenceFile(files?.back),
    left: sanitizeReferenceFile(files?.left),
    right: sanitizeReferenceFile(files?.right),
    top: sanitizeReferenceFile(files?.top),
  };
}

function resolveImportTemplateType(savedData = {}, blueprintData = {}) {
  return (
    savedData?.importTemplateType ||
    savedData?.import_type ||
    blueprintData?.import_template_type ||
    DEFAULT_IMPORT_TEMPLATE_TYPE
  );
}

function sanitizeImportDimensions(
  source = {},
  fallback = DEFAULT_IMPORT_DIMENSIONS,
) {
  return {
    w: Math.max(
      GRID_SIZE,
      snap(Number(source?.w ?? source?.width ?? fallback.w) || fallback.w),
    ),
    h: Math.max(
      GRID_SIZE,
      snap(Number(source?.h ?? source?.height ?? fallback.h) || fallback.h),
    ),
    d: Math.max(
      GRID_SIZE,
      snap(Number(source?.d ?? source?.depth ?? fallback.d) || fallback.d),
    ),
  };
}

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const createObjectId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function openBlueprintWindow(html, autoPrint = false) {
  const win = window.open(
    "about:blank",
    "_blank",
    "width=1280,height=900,resizable=yes,scrollbars=yes",
  );

  if (!win) {
    toast.error("Popup blocked. I-allow ang popups para sa export/print.");
    return false;
  }

  try {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } catch (err) {
    console.error("openBlueprintWindow write error:", err);
    toast.error("Failed to prepare export/print window.");
    try {
      win.close();
    } catch {}
    return false;
  }

  try {
    win.opener = null;
  } catch {}

  const triggerPrint = () => {
    if (!autoPrint || win.closed) return;

    const run = () => {
      try {
        win.focus();
        setTimeout(() => {
          try {
            win.print();
          } catch (printErr) {
            console.error("print error:", printErr);
            toast.error("Failed to open print dialog.");
          }
        }, 250);
      } catch (focusErr) {
        console.error("focus/print error:", focusErr);
      }
    };

    if (win.document.readyState === "complete") {
      run();
      return;
    }

    win.addEventListener(
      "load",
      () => {
        run();
      },
      { once: true },
    );
  };

  triggerPrint();
  return true;
}

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
  const [referenceFiles, setReferenceFiles] = useState(createEmptyReferenceFiles());
  const [referenceFile, setReferenceFile] = useState(null);
  const [editorMode, setEditorMode] = useState("editable");
  const [importTemplateType, setImportTemplateType] = useState(
    DEFAULT_IMPORT_TEMPLATE_TYPE,
  );
  const [importDimensions, setImportDimensions] = useState(
    DEFAULT_IMPORT_DIMENSIONS,
  );
  const [importComments, setImportComments] = useState("");
  const [ai3dState, setAi3dState] = useState(DEFAULT_AI3D_STATE);
  
  // ── Undo / Redo history ──────────────────────────────────────────────────
  const historyRef = useRef([]); // past snapshots
  const futureRef = useRef([]); // redo snapshots
  const skipHistoryRef = useRef(false); // skip next push (used on undo/redo itself)
  const [referenceCalibrationByView, setReferenceCalibrationByView] = useState(
  createEmptyReferenceCalibrationByView(),
  );

  const [traceObjectsByView, setTraceObjectsByView] = useState(
    createEmptyTraceObjectsByView(),
  );

  
  const [traceTool, setTraceTool] = useState("select");
  const [selectedTraceId, setSelectedTraceId] = useState(null);
  const [newTraceType, setNewTraceType] = useState("door");
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
    const validIdSet = new Set(components.map((c) => c.id));
    const filteredSelectedIds = (selectedIds || []).filter((id) =>
      validIdSet.has(id),
    );

    if (filteredSelectedIds.length !== (selectedIds || []).length) {
      setSelectedIds(filteredSelectedIds);
    }

    if (!components.length) {
      if (selectedId) setSelectedId(null);
      if (selectedIds.length) setSelectedIds([]);
      if (edit3DId) setEdit3DId(null);
      return;
    }

    const nextPrimary =
      selectedId && validIdSet.has(selectedId)
        ? selectedId
        : filteredSelectedIds[filteredSelectedIds.length - 1] || null;

    if (selectedId !== nextPrimary) {
      setSelectedId(nextPrimary);
    }

    if (!nextPrimary && edit3DId) {
      setEdit3DId(null);
    } else if (nextPrimary && (!edit3DId || !validIdSet.has(edit3DId))) {
      setEdit3DId(nextPrimary);
    }
  }, [components, selectedId, selectedIds, edit3DId]);

  useEffect(() => {
    if (!id || id === "new") {
    setReferenceFiles(createEmptyReferenceFiles());
    setReferenceFile(null);
    setEditorMode("editable");
    setImportTemplateType(DEFAULT_IMPORT_TEMPLATE_TYPE);
    setImportDimensions(DEFAULT_IMPORT_DIMENSIONS);
    setImportComments("");
    setAi3dState(DEFAULT_AI3D_STATE);
    setView("3d");
    setComponents([]);
    setSelectedId(null);
    setEdit3DId(null);
    setReferenceCalibrationByView(createEmptyReferenceCalibrationByView());
    setTraceObjectsByView(createEmptyTraceObjectsByView());
    setSelectedTraceId(null);
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

        const loadedTemplateType = resolveImportTemplateType(saved, r.data);
        const loadedImportDimensions = sanitizeImportDimensions(
          saved.importDimensions ||
            saved.referenceDimensions ||
            r.data.import_dimensions ||
            r.data.reference_dimensions ||
            DEFAULT_IMPORT_DIMENSIONS,
          DEFAULT_IMPORT_DIMENSIONS,
        );

        const loadedReferenceFiles = getReferenceFilesFromBlueprint(saved, r.data);
        const refFile = getReferenceFileFromBlueprint(saved, r.data, "front");
        const resolvedMode = getEditorMode(saved, loadedReferenceFiles);

        const loadedComponents = resolveInitialComponents(
          {
            ...saved,
            importTemplateType: loadedTemplateType,
            importDimensions: loadedImportDimensions,
          },
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
        setReferenceFiles(loadedReferenceFiles);
        setReferenceFile(
          loadedReferenceFiles?.front ||
            loadedReferenceFiles?.back ||
            loadedReferenceFiles?.left ||
            loadedReferenceFiles?.right ||
            loadedReferenceFiles?.top ||
            refFile ||
            null,
        );
        setEditorMode(resolvedMode);
        setImportTemplateType(loadedTemplateType);
        setImportDimensions(loadedImportDimensions);
        setImportComments(saved.importComments || "");
        const normalizedCalibrationByView = normalizeReferenceCalibrationByView(
          saved.referenceCalibrationByView ||
            saved.reference_calibration_by_view ||
            saved.referenceCalibration,
        );

        const normalizedTraceObjectsByView = normalizeTraceObjectsByView(
          saved.traceObjectsByView ||
            saved.trace_objects_by_view ||
            saved.traceObjects,
        );

        setReferenceCalibrationByView(normalizedCalibrationByView);
        setTraceObjectsByView(normalizedTraceObjectsByView);
        setSelectedTraceId(null);
          
        setAi3dState(normalizeAi3dState(saved.ai3d));
        setView(resolvedMode === "reference" ? "front" : "3d");
      })
      .catch(() => toast.error("Failed to load blueprint."));
  }, [id]);
  
  const selectedComp = components.find((c) => c.id === selectedId) || null; 

  const activeReferenceView = useMemo(() => {
    return REFERENCE_TRACE_VIEWS.includes(view) ? view : "front";
  }, [view]);

  const activeReferenceCalibration = useMemo(() => {
    return (
      referenceCalibrationByView?.[activeReferenceView] ||
      normalizeReferenceCalibration()
    );
  }, [referenceCalibrationByView, activeReferenceView]);

  const activeTraceObjects = useMemo(() => {
    return Array.isArray(traceObjectsByView?.[activeReferenceView])
      ? traceObjectsByView[activeReferenceView]
      : [];
  }, [traceObjectsByView, activeReferenceView]);

  const allTraceObjects = useMemo(() => {
    return flattenTraceObjectsByView(traceObjectsByView);
  }, [traceObjectsByView]);

  const setActiveReferenceCalibration = useCallback(
    (nextValue) => {
      setReferenceCalibrationByView((prev) => {
        const current =
          prev?.[activeReferenceView] || normalizeReferenceCalibration();

        const resolved =
          typeof nextValue === "function" ? nextValue(current) : nextValue;

        return {
          ...createEmptyReferenceCalibrationByView(),
          ...prev,
          [activeReferenceView]: normalizeReferenceCalibration(resolved),
        };
      });
    },
    [activeReferenceView],
  );

  const setActiveTraceObjects = useCallback(
    (nextValue) => {
      setTraceObjectsByView((prev) => {
        const current = Array.isArray(prev?.[activeReferenceView])
          ? prev[activeReferenceView]
          : [];

        const resolved =
          typeof nextValue === "function" ? nextValue(current) : nextValue;

        return {
          ...createEmptyTraceObjectsByView(),
          ...prev,
          [activeReferenceView]: normalizeTraceObjects(
            resolved,
            activeReferenceView,
          ),
        };
      });
    },
    [activeReferenceView],
  );

  useEffect(() => {
    setSelectedTraceId(null);
  }, [activeReferenceView]);

  const hasAnyReferenceFile = useMemo(() => {
    return Object.values(referenceFiles || {}).some((file) => file?.url);
  }, [referenceFiles]);

  const selectedComponents = useMemo(() => {
    const activeIds = Array.from(new Set((selectedIds || []).filter(Boolean)));

    if (activeIds.length) {
      const activeSet = new Set(activeIds);
      return components.filter((c) => activeSet.has(c.id));
    }

    return getSelectionGroup(components, selectedComp);
  }, [components, selectedComp, selectedIds]);


  
  
  const hasRealComponents = useMemo(() => {
    return Array.isArray(components)
      ? components.some((c) => c.type !== "reference_proxy")
      : false;
  }, [components]);
  const ai3dBusy = ["queued", "processing"].includes(ai3dState.status);

  const selectedBounds3D = useMemo(() => {
    return getComponentsBounds3D(selectedComponents);
  }, [selectedComponents]);

  const selectedLabel = useMemo(() => {
    if (!selectedComp) return "";
    if (selectedIds.length > 1) return `${selectedIds.length} Selected Objects`;
    return selectedComp.groupLabel || selectedComp.label;
  }, [selectedComp, selectedIds]);

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
        setSelectedIds([]);
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
          setEdit3DId(components[0].id);
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
    (cid, attrs, options = {}) => {
      if (editorMode !== "editable") {
        toast.error("Nasa reference mode ka. Lumipat muna sa editable mode.");
        return;
      }

      const shouldApplyToSelection = !!options.applyToSelection;
      const targetIds =
        shouldApplyToSelection &&
        selectedIds.includes(cid) &&
        selectedIds.length > 1
          ? selectedIds
          : [cid];

      if (!targetIds.length) return;

      if (!options.skipHistory) {
        pushHistory(components);
      }

      const targetSet = new Set(targetIds);

      setComponents((prev) =>
        prev.map((c) =>
          targetSet.has(c.id) ? normalizeComponent({ ...c, ...attrs }) : c,
        ),
      );
    },
    [editorMode, components, pushHistory, selectedIds],
  );

  const updateManyComps = useCallback(
    (changesById = {}, options = {}) => {
      if (editorMode !== "editable") {
        toast.error("Nasa reference mode ka. Lumipat muna sa editable mode.");
        return;
      }

      const entries = Object.entries(changesById).filter(
        ([, attrs]) => attrs && Object.keys(attrs).length,
      );

      if (!entries.length) return;

      if (!options.skipHistory) {
        pushHistory(components);
      }

      const changeMap = new Map(entries);

      setComponents((prev) =>
        prev.map((c) => {
          const attrs = changeMap.get(c.id);
          return attrs ? normalizeComponent({ ...c, ...attrs }) : c;
        }),
      );
    },
    [editorMode, components, pushHistory],
  );

  const switchToReferenceMode = useCallback(() => {
    setEditorMode("reference");
    setView((prevView) => (prevView === "3d" ? "front" : prevView));
    toast.success("Reference Mode enabled. Blueprints are now read-only.");
  }, []);

  const switchToEditableMode = useCallback(() => {
    setEditorMode("editable");
    setView("3d");

    // Editable mode should stay blank if wala pang real components.
    // Huwag mag-auto create ng default imported furniture.
    setComponents((prev) =>
      Array.isArray(prev) ? prev.map(normalizeComponent) : [],
    );

    toast.success("Editable mode enabled.");
  }, []);
  
  const updateReferenceDimension = useCallback((key, value) => {
    const numeric = Number(value);

    setImportDimensions((prev) => ({
      ...prev,
      [key]:
        Number.isFinite(numeric) && numeric > 0
          ? numeric
          : prev[key],
    }));
  }, []);

  const handleConvertReferenceToEditable = useCallback(() => {
    const activeReference =
    referenceFiles?.front ||
    referenceFiles?.back ||
    referenceFiles?.left ||
    referenceFiles?.right ||
    referenceFiles?.top ||
    referenceFile;

  if (!activeReference?.url) {
    toast.error("Walang reference file na iko-convert.");
    return;
  }

    if (!Array.isArray(allTraceObjects) || !allTraceObjects.length) {
      toast.error("Mag-trace muna ng layout bago mag-convert.");
      return;
    }

    if (
      hasRealComponents &&
      !window.confirm(
        "May existing converted components na. Papalitan ito ng bagong converted cabinet layout. Itutuloy?",
      )
    ) {
      return;
    }

    const normalizeProjectionView = (rawView = "front") => {
      if (rawView === "back") return "front";
      if (rawView === "right") return "left";
      if (rawView === "top") return "top";
      return "front";
    };

    const targetOverall = {
      w: Math.max(200, snap(Number(importDimensions?.w || 2400))),
      h: Math.max(200, snap(Number(importDimensions?.h || 2400))),
      d: Math.max(100, snap(Number(importDimensions?.d || 600))),
    };
    
    const treatAsChair = isLikelyChairReference({
      importTemplateType,
      importDimensions: targetOverall,
      traceObjectsByView,
    });

    if (treatAsChair) {
      const generated = createImportedDiningChairComponents(
        {
          importDimensions: targetOverall,
        },
        activeReference,
        {
          ...(blueprint || {}),
          title: blueprint?.title || "Imported Chair",
        },
        {
          w: WORLD_W,
          h: WORLD_H,
          d: WORLD_D,
        },
      );

      if (!generated.length) {
        toast.error("Walang na-generate na chair parts.");
        return;
      }

      pushHistory(
        Array.isArray(components)
          ? components.map((c) => normalizeComponent(c))
          : [],
      );

      setComponents(generated);
      setSelectedId(generated[0]?.id || null);
      setSelectedIds(generated.map((item) => item.id));
      setEdit3DId(generated[0]?.id || null);
      setEditorMode("editable");
      setView("3d");
      setTransformMode("translate");
      setTraceTool("select");
      setActiveChairBuild(
        generated[0]?.groupId
          ? {
              id: generated[0].groupId,
              label: generated[0].groupLabel || "Imported Chair",
            }
          : null,
      );

      toast.success(
        `Converted reference into ${generated.length} editable chair parts.`,
      );
      return;
    }
        const cleaned = normalizeTraceObjects(allTraceObjects, "front")
      .filter((obj) => Number(obj?.width) > 5 && Number(obj?.height) > 5)
      .map((obj, index) => ({
        ...obj,
        traceIndex: index,
        projectionView: normalizeProjectionView(
          obj?.projectionView || obj?.traceView || obj?.view || "front",
        ),
      }));

    if (!cleaned.length) {
      toast.error("Walang valid traced rectangles.");
      return;
    }

    const traceBuckets = cleaned.reduce(
      (acc, obj) => {
        acc[obj.projectionView] = acc[obj.projectionView] || [];
        acc[obj.projectionView].push(obj);
        return acc;
      },
      { front: [], left: [], top: [] },
    );

    const sortLeftToRight = (a, b) =>
      Number(a.x) - Number(b.x) ||
      Number(a.y) - Number(b.y) ||
      Number(a.traceIndex) - Number(b.traceIndex);

    const sortTopToBottom = (a, b) =>
      Number(a.y) - Number(b.y) ||
      Number(a.x) - Number(b.x) ||
      Number(a.traceIndex) - Number(b.traceIndex);

    const frontSections = [...(traceBuckets.front || [])].sort(sortLeftToRight);
    const topSections = [...(traceBuckets.top || [])].sort(sortLeftToRight);
    const leftSections = [...(traceBuckets.left || [])].sort(sortTopToBottom);

    if (!frontSections.length) {
      toast.error(
        "Mag-trace ng cabinet sections sa Front o Back view bago mag-convert.",
      );
      return;
    }

    const getBounds = (items = []) => ({
      minX: Math.min(...items.map((o) => o.x)),
      minY: Math.min(...items.map((o) => o.y)),
      maxX: Math.max(...items.map((o) => o.x + o.width)),
      maxY: Math.max(...items.map((o) => o.y + o.height)),
    });

    const frontBounds = getBounds(frontSections);
    const frontWidthPx = Math.max(1, frontBounds.maxX - frontBounds.minX);
    const frontHeightPx = Math.max(1, frontBounds.maxY - frontBounds.minY);

    const topBounds = topSections.length ? getBounds(topSections) : null;
    const topDepthPx = topBounds
      ? Math.max(1, topBounds.maxY - topBounds.minY)
      : 1;

    const leftBounds = leftSections.length ? getBounds(leftSections) : null;
    const leftDepthPx = leftBounds
      ? Math.max(1, leftBounds.maxX - leftBounds.minX)
      : 1;

    const originX = snap((WORLD_W - targetOverall.w) / 2);
    const originZ = snap((WORLD_D - targetOverall.d) / 2);
    const floorY = WORLD_H - FLOOR_OFFSET;

    const baseMaterial = "Oak Wood";
    const finishId = getDefaultFinishId(baseMaterial);
    const finishData = applyWoodFinish(
      { material: baseMaterial, fill: "#d9c2a5" },
      finishId,
    );

    const conversionGroupId = makeGroupId();
    const conversionGroupLabel = `${
      blueprint?.title || "Reference Cabinet"
    } Converted`;

    const faceThickness = Math.max(
      18,
      snap(Math.min(40, targetOverall.d * 0.04)),
    );
    const insetGap = 20;
    const faceGap = 12;

    const inferSectionMeta = (obj, index, total) => {
      const widthRatio = obj.width / frontWidthPx;
      const centerRatio =
        ((obj.x + obj.width / 2) - frontBounds.minX) / frontWidthPx;

      if (total === 1) {
        return {
          kind: "main",
          label: "Main Cabinet Body",
        };
      }

      if (widthRatio <= 0.2) {
        return {
          kind: "drawer",
          label:
            centerRatio < 0.5 ? "Left Drawer Column" : "Right Drawer Column",
        };
      }

      if (index === 0) {
        return { kind: "section", label: "Left Cabinet Section" };
      }

      if (index === total - 1) {
        return { kind: "section", label: "Right Cabinet Section" };
      }

      return {
        kind: "section",
        label: `Center Cabinet Section ${index}`,
      };
    };

    const getDepthDataForSection = (index) => {
      if (topSections.length === frontSections.length) {
        const topObj = topSections[index];
        const depthMm = Math.max(
          80,
          snap((topObj.height / topDepthPx) * targetOverall.d),
        );
        const zOffsetMm = snap(
          ((topObj.y - topBounds.minY) / topDepthPx) * targetOverall.d,
        );
        return { depthMm, zOffsetMm };
      }

      if (topSections.length === 1) {
        return { depthMm: targetOverall.d, zOffsetMm: 0 };
      }

      if (leftSections.length === frontSections.length) {
        const sideObj = leftSections[index];
        const depthMm = Math.max(
          80,
          snap((sideObj.width / leftDepthPx) * targetOverall.d),
        );
        return { depthMm, zOffsetMm: 0 };
      }

      if (leftSections.length === 1) {
        return { depthMm: targetOverall.d, zOffsetMm: 0 };
      }

      return { depthMm: targetOverall.d, zOffsetMm: 0 };
    };

    const generated = [];

    frontSections.forEach((obj, index) => {
      const sectionNo = index + 1;
      const meta = inferSectionMeta(obj, index, frontSections.length);

      const widthMm = Math.max(
        100,
        snap((obj.width / frontWidthPx) * targetOverall.w),
      );

      const heightMm = Math.max(
        120,
        snap((obj.height / frontHeightPx) * targetOverall.h),
      );

      const leftOffsetMm = snap(
        ((obj.x - frontBounds.minX) / frontWidthPx) * targetOverall.w,
      );

      const bottomGapMm = snap(
        ((frontBounds.maxY - (obj.y + obj.height)) / frontHeightPx) *
          targetOverall.h,
      );

      const { depthMm, zOffsetMm } = getDepthDataForSection(index);

      const sectionX = originX + leftOffsetMm;
      const sectionY = floorY - heightMm - bottomGapMm;
      const sectionZ = originZ + zOffsetMm;

      const bodyDepthMm = Math.max(80, snap(depthMm - faceThickness));

      generated.push(
        normalizeComponent({
          id: makeId(),
          groupId: conversionGroupId,
          groupLabel: conversionGroupLabel,
          groupType: "assembly",
          partCode: `S${sectionNo}-BODY`,
          type: "cabinet_section_body",
          label: meta.label,
          category: "Reference Cabinet",
          blueprintStyle: "box",
          x: sectionX,
          y: sectionY,
          z: sectionZ,
          width: widthMm,
          height: heightMm,
          depth: bodyDepthMm,
          fill: finishData.fill || "#d9c2a5",
          material: finishData.material || baseMaterial,
          finish: finishData.finish || "",
          qty: 1,
          locked: false,
        }),
      );

      const usableWidth = Math.max(80, widthMm - insetGap * 2);
      const usableHeight = Math.max(120, heightMm - insetGap * 2);
      const faceX = sectionX + insetGap;
      const faceY = sectionY + insetGap;
      const faceZ = sectionZ + Math.max(0, depthMm - faceThickness);

      if (meta.kind === "drawer") {
        const drawerCount = Math.max(3, Math.min(4, Math.round(heightMm / 700)));
        const innerGapTotal = faceGap * (drawerCount - 1);
        const eachDrawerHeight = Math.max(
          120,
          snap((usableHeight - innerGapTotal) / drawerCount),
        );

        for (let drawerIndex = 0; drawerIndex < drawerCount; drawerIndex += 1) {
          generated.push(
            normalizeComponent({
              id: makeId(),
              groupId: conversionGroupId,
              groupLabel: conversionGroupLabel,
              groupType: "assembly",
              partCode: `S${sectionNo}-DR${drawerIndex + 1}`,
              type: "drawer_front_panel",
              label: `${meta.label} Drawer ${drawerIndex + 1}`,
              category: "Reference Cabinet",
              blueprintStyle: "box",
              x: faceX,
              y: faceY + drawerIndex * (eachDrawerHeight + faceGap),
              z: faceZ,
              width: usableWidth,
              height: eachDrawerHeight,
              depth: faceThickness,
              fill: finishData.fill || "#d9c2a5",
              material: finishData.material || baseMaterial,
              finish: finishData.finish || "",
              qty: 1,
              locked: false,
            }),
          );
        }

        return;
      }

      if (usableWidth >= 900) {
        const splitGap = 14;
        const doorWidth = Math.max(120, snap((usableWidth - splitGap) / 2));

        generated.push(
          normalizeComponent({
            id: makeId(),
            groupId: conversionGroupId,
            groupLabel: conversionGroupLabel,
            groupType: "assembly",
            partCode: `S${sectionNo}-DL`,
            type: "door_front_panel",
            label: `${meta.label} Left Door`,
            category: "Reference Cabinet",
            blueprintStyle: "box",
            x: faceX,
            y: faceY,
            z: faceZ,
            width: doorWidth,
            height: usableHeight,
            depth: faceThickness,
            fill: finishData.fill || "#d9c2a5",
            material: finishData.material || baseMaterial,
            finish: finishData.finish || "",
            qty: 1,
            locked: false,
          }),
        );

        generated.push(
          normalizeComponent({
            id: makeId(),
            groupId: conversionGroupId,
            groupLabel: conversionGroupLabel,
            groupType: "assembly",
            partCode: `S${sectionNo}-DR`,
            type: "door_front_panel",
            label: `${meta.label} Right Door`,
            category: "Reference Cabinet",
            blueprintStyle: "box",
            x: faceX + doorWidth + splitGap,
            y: faceY,
            z: faceZ,
            width: doorWidth,
            height: usableHeight,
            depth: faceThickness,
            fill: finishData.fill || "#d9c2a5",
            material: finishData.material || baseMaterial,
            finish: finishData.finish || "",
            qty: 1,
            locked: false,
          }),
        );

        return;
      }

      generated.push(
        normalizeComponent({
          id: makeId(),
          groupId: conversionGroupId,
          groupLabel: conversionGroupLabel,
          groupType: "assembly",
          partCode: `S${sectionNo}-FACE`,
          type: "door_front_panel",
          label: `${meta.label} Front Panel`,
          category: "Reference Cabinet",
          blueprintStyle: "box",
          x: faceX,
          y: faceY,
          z: faceZ,
          width: usableWidth,
          height: usableHeight,
          depth: faceThickness,
          fill: finishData.fill || "#d9c2a5",
          material: finishData.material || baseMaterial,
          finish: finishData.finish || "",
          qty: 1,
          locked: false,
        }),
      );
    });

    if (!generated.length) {
      toast.error("Walang na-generate na cabinet parts.");
      return;
    }

    pushHistory(
      Array.isArray(components)
        ? components.map((c) => normalizeComponent(c))
        : [],
    );

    setComponents(generated);
    setSelectedId(generated[0]?.id || null);
    setSelectedIds(generated.map((item) => item.id));
    setEdit3DId(generated[0]?.id || null);
    setEditorMode("editable");
    setView("3d");
    setTransformMode("translate");
    setTraceTool("select");

    toast.success(
      `Converted ${frontSections.length} traced section${
        frontSections.length > 1 ? "s" : ""
      } into ${generated.length} editable cabinet part${
        generated.length > 1 ? "s" : ""
      }.`,
    );
  }, [
    referenceFile,
    referenceFiles,
    allTraceObjects,
    importDimensions,
    importTemplateType,
    traceObjectsByView,
    hasRealComponents,
    components,
    pushHistory,
    blueprint,
    WORLD_W,
    WORLD_H,
    WORLD_D,
  ]);

  const handleGenerateAi3DModel = useCallback(async () => {
    const aiReference =
      referenceFiles?.front ||
      referenceFiles?.back ||
      referenceFiles?.left ||
      referenceFiles?.right ||
      referenceFiles?.top ||
      referenceFile;

    if (!aiReference?.url) {
      toast.error("Mag-import muna ng JPG o PNG reference.");
      return;
    }

    try {
      const { data } = await api.post(`/blueprints/${id}/ai3d/generate`);
      const nextState = normalizeAi3dState(data?.ai3d);

      setAi3dState(nextState);
      setView("3d");
      toast.success(data?.message || "AI 3D generation started.");
    } catch (err) {
      console.error("handleGenerateAi3DModel error:", err);
      toast.error(
        err?.response?.data?.message || "Failed to start AI 3D generation.",
      );
    }
  }, [id, referenceFile, referenceFiles]);

  const refreshAi3DStatus = useCallback(
    async (silent = false) => {
      if (!id || id === "new") return;

      try {
        const previousStatus = ai3dState.status;
        const { data } = await api.get(`/blueprints/${id}/ai3d/status`);
        const nextState = normalizeAi3dState(data?.ai3d);

        setAi3dState(nextState);

        if (!silent && nextState.status === "done" && previousStatus !== "done") {
          toast.success("AI 3D model is ready.");
        }
      } catch (err) {
        console.error("refreshAi3DStatus error:", err);
        if (!silent) {
          toast.error(
            err?.response?.data?.message || "Failed to fetch AI 3D status.",
          );
        }
      }
    },
    [id, ai3dState.status],
  );

  useEffect(() => {
    if (!id || id === "new") return;
    if (!["queued", "processing"].includes(ai3dState.status)) return;

    const timer = window.setInterval(() => {
      refreshAi3DStatus(true);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [id, ai3dState.status, refreshAi3DStatus]);

  useEffect(() => {
    const activeView = view === "3d" ? "front" : view;

    const nextReference =
      referenceFiles?.[activeView] ||
      referenceFiles?.front ||
      referenceFiles?.back ||
      referenceFiles?.left ||
      referenceFiles?.right ||
      referenceFiles?.top ||
      null;

    setReferenceFile(nextReference);
  }, [view, referenceFiles]);


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

        const rawParts = buildFurnitureTemplateParts({
          templateType: t.type,
          buildId: groupId,
          originX: x,
          originZ: z,
          canvasH: WORLD_H,
          groupLabel,
        });

        const parts = rawParts.map((part) =>
          normalizeComponent({
            ...part,
            templateType: t.type,
            groupUnitPrice: Number(t.unitPrice) || 0,
          }),
        );

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

  
  const removeSelected = () => {
    if (editorMode !== "editable") {
      toast.error(
        "Reference mode ito. Walang editable components na puwedeng burahin.",
      );
      return;
    }

    // Target all selected IDs
    const idsToRemove = new Set(
      selectedIds.length > 0 ? selectedIds : [selectedId].filter(Boolean),
    );

    if (idsToRemove.size === 0) return;

    // Prevent deletion if ANY of the selected components are locked
    const hasLocked = components.some(
      (c) => idsToRemove.has(c.id) && isLocked(c),
    );
    if (hasLocked) {
      toast.error("Cannot delete. One or more selected components are locked.");
      return;
    }

    pushHistory(components);
    setComponents((prev) => prev.filter((c) => !idsToRemove.has(c.id)));
    setSelectedId(null);
    setSelectedIds([]);
    setEdit3DId(null);
    toast.success(`Deleted ${idsToRemove.size} object(s).`);
  };

  const saveDesign = async () => {
    if (!id || id === "new") {
      toast.error("Create the blueprint record first before saving the design.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        unit,
        editorMode,
        components: Array.isArray(components)
          ? components.map((c) => normalizeComponent(c))
          : [],
        reference_files: sanitizeReferenceFiles(referenceFiles),
        reference_file: sanitizeReferenceFile(
          referenceFiles?.front || referenceFile,
        ),
        importTemplateType,
        importDimensions: sanitizeImportDimensions(importDimensions),
        importComments,
        ai3d: normalizeAi3dState(ai3dState),
        worldSize: { w: WORLD_W, h: WORLD_H, d: WORLD_D },
        sheetSize: { w: SHEET_W, h: SHEET_H },
        exportViews: EXPORT_VIEWS,
        referenceCalibrationByView: normalizeReferenceCalibrationByView(
          referenceCalibrationByView,
        ),
        traceObjectsByView: normalizeTraceObjectsByView(traceObjectsByView),

        // legacy fallback para hindi masira ang old saved data readers
        referenceCalibration: normalizeReferenceCalibration(
          referenceCalibrationByView?.front || activeReferenceCalibration,
        ),
        traceObjects: flattenTraceObjectsByView(traceObjectsByView),
      };

      await api.put(`/blueprints/${id}`, {
        design_data: JSON.stringify(payload),
      });

      toast.success("Blueprint saved.");
    } catch (error) {
      console.error("saveDesign error:", error);
      toast.error(
        error?.response?.data?.message || "Save failed. Check server connection.",
      );
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
    const activeView = view === "3d" ? "front" : view;
    const activeReference =
      referenceFiles?.[activeView] ||
      referenceFiles?.front ||
      referenceFile;

    if (!activeReference?.url) {
      toast.error("No reference file available.");
      return;
    }

    window.open(
      resolveAssetUrl(activeReference.url),
      "_blank",
      "noopener,noreferrer",
    );
  }, [view, referenceFiles, referenceFile]);

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
    <div style={S.fullScreenWrapper}>
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
        {referenceFile?.url && (
          <span
            style={{
              fontSize: 11,
              background: "#1f2937",
              padding: "2px 10px",
              borderRadius: 20,
              color:
                ai3dState.status === "done"
                  ? "#86efac"
                  : ai3dState.status === "error"
                    ? "#fca5a5"
                    : "#fcd34d",
            }}
          >
            AI 3D: {AI3D_STATUS_LABELS[ai3dState.status] || "Idle"}
            {ai3dBusy ? ` · ${ai3dState.progress || 0}%` : ""}
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

          

          {hasAnyReferenceFile && (
            <button
              onClick={handleConvertReferenceToEditable}
              disabled={!allTraceObjects.length}
              style={{
                ...S.toolBtn,
                background: "#b45309",
                opacity: allTraceObjects.length ? 1 : 0.45,
              }}
            >
              {hasRealComponents ? "♻ Re-convert Reference" : "🧩 Convert Reference"}
            </button>
          )}

          {hasAnyReferenceFile && (
            <button
              onClick={handleGenerateAi3DModel}
              disabled={ai3dBusy}
              style={{
                ...S.toolBtn,
                background: "#7c3aed",
                opacity: ai3dBusy ? 0.55 : 1,
              }}
            >
              {ai3dBusy ? `⏳ Generating 3D... ${ai3dState.progress || 0}%` : "✨ Generate 3D Model"}
            </button>
          )}
          

          {referenceFile && ai3dState.taskId && (
            <button
              onClick={() => refreshAi3DStatus(false)}
              style={{ ...S.toolBtn, background: "#475569" }}
            >
              🔄 3D Status
            </button>
          )}

          {ai3dState.modelUrl && (
            <button
              onClick={() =>
                window.open(ai3dState.modelUrl, "_blank", "noopener,noreferrer")
              }
              style={{ ...S.toolBtn, background: "#0f766e" }}
            >
              🧊 Open GLB
            </button>
          )}

          <button
            onClick={() => navigate(`/blueprints/${id}/import`)}
            style={{ ...S.toolBtn, background: "#0ea5e9" }}
          >
            📥 Import
          </button>

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
              onBatchUpdateComps={updateManyComps}
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
                  editorMode={editorMode}
                  referenceCalibration={activeReferenceCalibration}
                  setReferenceCalibration={setActiveReferenceCalibration}
                  traceObjects={activeTraceObjects}
                  setTraceObjects={setActiveTraceObjects}
                  traceTool={traceTool}
                  selectedTraceId={selectedTraceId}
                  setSelectedTraceId={setSelectedTraceId}
                  newTraceType={newTraceType}
                />
              </div>
            </div>
          </div>
          {traceTool === "rect" && (
            <div style={{ marginTop: 10 }}>
              <label style={S.propLabel}>Trace Type</label>
              <select
                value={newTraceType}
                onChange={(e) => setNewTraceType(e.target.value)}
                style={S.propInput}
              >
                {TRACE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
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
                  updateComp(
                    selectedComp.id,
                    {
                      cornerRadius: Number(e.target.value),
                    },
                    {
                      applyToSelection: selectedIds.length > 1,
                    },
                  )
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
                  updateComp(
                    selectedComp.id,
                    {
                      cornerRadius: Math.max(
                        0,
                        Math.min(500, Number(e.target.value) || 0),
                      ),
                    },
                    {
                      applyToSelection: selectedIds.length > 1,
                    },
                  )
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
                <div>Trace Objects (This View): {activeTraceObjects.length}</div>
                <div>Trace Objects (All Views): {allTraceObjects.length}</div>
                <div>
                  Calibrated ({activeReferenceView.toUpperCase()}):{" "}
                  {activeReferenceCalibration?.isCalibrated ? "Yes" : "No"}
                </div>
                <div>
                  Pixels/MM ({activeReferenceView.toUpperCase()}):{" "}
                  {Number(activeReferenceCalibration?.pixelsPerMm || 0).toFixed(4)}
                </div>
                <div>
                  Real Distance MM ({activeReferenceView.toUpperCase()}):{" "}
                  {Number(activeReferenceCalibration?.realDistanceMm || 0)}
                </div>
                <div>
                  Points ({activeReferenceView.toUpperCase()}):{" "}
                  {Array.isArray(activeReferenceCalibration?.points)
                    ? activeReferenceCalibration.points.length
                    : 0}
                </div>
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
              {editorMode === "reference" && view !== "3d" && (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: "1px solid #334155",
                  }}
                >
                  <p style={S.panelLabel}>Reference Conversion Setup</p>

                  <div
                    style={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      padding: 10,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <label style={S.propLabel}>Overall Width (mm)</label>
                      <input
                        type="number"
                        value={importDimensions.w}
                        onChange={(e) => updateReferenceDimension("w", e.target.value)}
                        style={S.propInput}
                      />
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <label style={S.propLabel}>Overall Height (mm)</label>
                      <input
                        type="number"
                        value={importDimensions.h}
                        onChange={(e) => updateReferenceDimension("h", e.target.value)}
                        style={S.propInput}
                      />
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <label style={S.propLabel}>Overall Depth (mm)</label>
                      <input
                        type="number"
                        value={importDimensions.d}
                        onChange={(e) => updateReferenceDimension("d", e.target.value)}
                        style={S.propInput}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() =>
                          setActiveReferenceCalibration({
                            points: [],
                            realDistanceMm: 0,
                            pixelsPerMm: 0,
                            isCalibrated: false,
                          })
                        }
                        style={{ ...S.toolBtn, flex: 1, background: "#334155" }}
                      >
                        Clear Scale
                      </button>

                      <button
                        onClick={() => {
                          setActiveTraceObjects([]);
                          setSelectedTraceId(null);
                        }}
                        style={{ ...S.toolBtn, flex: 1, background: "#7f1d1d" }}
                      >
                        Clear Traces
                      </button>

                      
                    </div>
                  </div>
                </div>
              )}
              {editorMode === "reference" && view !== "3d" && (
                <div
                  style={{
                    display: "flex",
                    gap: 3,
                    background: "#0f172a",
                    borderRadius: 8,
                    padding: 3,
                  }}
                > 
                  {[
                    { key: "select", label: "Select" },
                    { key: "calibrate", label: "Set Scale" },
                    { key: "rect", label: "Trace Rect" },
                  ].map((tool) => (
                    <button
                      key={tool.key}
                      onClick={() => setTraceTool(tool.key)}
                      style={{
                        ...S.toolBtn,
                        background: traceTool === tool.key ? "#f97316" : "transparent",
                        fontWeight: traceTool === tool.key ? 700 : 400,
                        padding: "4px 12px",
                      }}
                    >
                      {tool.label}
                    </button>
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
