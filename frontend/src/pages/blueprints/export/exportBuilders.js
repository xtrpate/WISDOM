// export/exportBuilders.js — SVG, HTML, and PDF export builders
import {
  getComponentsBounds3D,
  get2DBounds,
  getProjectedBox,
  shouldMirrorView,
  getMirroredBox,
  getViewSheetCode,
} from "../data/componentUtils";
import {
  getScaledExportItems,
  getExportDrawingArea,
  getExportRawItems,
} from "./placementHelpers";
import {
  escapeHtml,
  snap,
  clamp,
  formatDims,
  getNowStamp,
  formatDim,
} from "../data/utils";
import {
  VIEWS,
  EXPORT_VIEWS,
  CASEWORK_SET,
  TABLE_SET,
  BENCH_SET,
  CHAIR_PART_SET,
  WOOD_FINISHES,
} from "../data/furnitureTypes";
import {
  renderBlueprintShape,
  renderCaseworkBlueprint,
  renderSofaBlueprint,
  renderBedBlueprint,
  renderBenchBlueprint,
  renderLoungerBlueprint,
  renderOfficeChairBlueprint,
  renderPatioSetBlueprint,
  renderTableBlueprint,
  renderChairLegShape,
  getBlueprintStroke,
  buildBlueprintSvgMarkup,
} from "../2d/render2D";

const GRID_SIZE = 20;
const BOARD = 18;
const PAPER_MARGIN = 28;
const TITLE_BLOCK_H = 96;
const DRAWING_PADDING = 56;
const EXPORT_PAGE_W = 1200;
const EXPORT_PAGE_H = 820;

function svgLine(x1, y1, x2, y2, extra = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra} />`;
}

function svgRect(x, y, w, h, extra = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${extra} />`;
}

function svgText(x, y, text, extra = "") {
  return `<text x="${x}" y="${y}" ${extra}>${escapeHtml(text)}</text>`;
}

function buildSvgDimensionLine(
  x1,
  y1,
  x2,
  y2,
  text,
  orientation = "horizontal",
  offset = 24,
) {
  const dimColor = "#0f172a";
  const extColor = "#475569";

  if (orientation === "horizontal") {
    const y = y1 - offset;
    return `
      ${svgLine(x1, y1, x1, y, `stroke="${extColor}" stroke-width="1"`)}
      ${svgLine(x2, y2, x2, y, `stroke="${extColor}" stroke-width="1"`)}
      ${svgLine(x1, y, x2, y, `stroke="${dimColor}" stroke-width="1"`)}
      ${svgLine(x1, y, x1 + 8, y - 4, `stroke="${dimColor}" stroke-width="1"`)}
      ${svgLine(x1, y, x1 + 8, y + 4, `stroke="${dimColor}" stroke-width="1"`)}
      ${svgLine(x2, y, x2 - 8, y - 4, `stroke="${dimColor}" stroke-width="1"`)}
      ${svgLine(x2, y, x2 - 8, y + 4, `stroke="${dimColor}" stroke-width="1"`)}
      ${svgText((x1 + x2) / 2, y - 8, text, `fill="${dimColor}" font-size="10" text-anchor="middle"`)}
    `;
  }

  const x = x1 + offset;
  return `
    ${svgLine(x1, y1, x, y1, `stroke="${extColor}" stroke-width="1"`)}
    ${svgLine(x2, y2, x, y2, `stroke="${extColor}" stroke-width="1"`)}
    ${svgLine(x, y1, x, y2, `stroke="${dimColor}" stroke-width="1"`)}
    ${svgLine(x, y1, x - 4, y1 + 8, `stroke="${dimColor}" stroke-width="1"`)}
    ${svgLine(x, y1, x + 4, y1 + 8, `stroke="${dimColor}" stroke-width="1"`)}
    ${svgLine(x, y2, x - 4, y2 - 8, `stroke="${dimColor}" stroke-width="1"`)}
    ${svgLine(x, y2, x + 4, y2 - 8, `stroke="${dimColor}" stroke-width="1"`)}
    ${svgText(x + 8, (y1 + y2) / 2, text, `fill="${dimColor}" font-size="10"`)}
  `;
}

function buildSvgPaperMarkup(pageW, pageH) {
  const refs = [];
  const refStep = 80;

  for (let x = PAPER_MARGIN + refStep; x < pageW - PAPER_MARGIN; x += refStep) {
    refs.push(
      svgText(
        x - 4,
        PAPER_MARGIN - 8,
        `${Math.round((x - PAPER_MARGIN) / refStep)}`,
        `fill="#64748b" font-size="9"`,
      ),
    );
  }

  for (
    let y = PAPER_MARGIN + refStep;
    y < pageH - PAPER_MARGIN - TITLE_BLOCK_H;
    y += refStep
  ) {
    refs.push(
      svgText(
        PAPER_MARGIN - 18,
        y + 4,
        String.fromCharCode(64 + Math.round((y - PAPER_MARGIN) / refStep)),
        `fill="#64748b" font-size="9"`,
      ),
    );
  }

  return `
    ${svgRect(0, 0, pageW, pageH, `fill="#ffffff"`)}
    ${svgRect(PAPER_MARGIN, PAPER_MARGIN, pageW - PAPER_MARGIN * 2, pageH - PAPER_MARGIN * 2, `fill="none" stroke="#0f172a" stroke-width="1.6"`)}
    ${svgRect(
      PAPER_MARGIN + 8,
      PAPER_MARGIN + 8,
      pageW - PAPER_MARGIN * 2 - 16,
      pageH - PAPER_MARGIN * 2 - 16,
      `fill="none" stroke="#94a3b8" stroke-width="0.8"`,
    )}
    ${refs.join("")}
  `;
}

function buildSvgTitleBlockMarkup({
  pageW,
  pageH,
  blueprintTitle,
  objectLabel,
  viewLabel,
  materialText,
  dimsText,
  unit,
  scaleText = "NTS",
  sheetCode = "A-101",
}) {
  const x = PAPER_MARGIN;
  const y = pageH - PAPER_MARGIN - TITLE_BLOCK_H;
  const w = pageW - PAPER_MARGIN * 2;
  const h = TITLE_BLOCK_H;

  return `
    ${svgRect(x, y, w, h, `fill="#ffffff" stroke="#0f172a" stroke-width="1.4"`)}
    ${svgLine(x + w - 390, y, x + w - 390, y + h, `stroke="#0f172a" stroke-width="1"`)}
    ${svgLine(x + w - 230, y, x + w - 230, y + h, `stroke="#0f172a" stroke-width="1"`)}
    ${svgLine(x + w - 120, y, x + w - 120, y + h, `stroke="#0f172a" stroke-width="1"`)}
    ${svgLine(x, y + 32, x + w, y + 32, `stroke="#0f172a" stroke-width="1"`)}
    ${svgLine(x + w - 390, y + 54, x + w, y + 54, `stroke="#0f172a" stroke-width="1"`)}
    ${svgLine(x + w - 390, y + 76, x + w, y + 76, `stroke="#0f172a" stroke-width="1"`)}

    ${svgText(x + 10, y + 16, "PROJECT / BLUEPRINT TITLE", `font-size="9" fill="#64748b"`)}
    ${svgText(x + 10, y + 48, blueprintTitle || "Blueprint Design", `font-size="15" font-weight="700" fill="#0f172a"`)}
    ${svgText(x + w - 380, y + 16, "OBJECT", `font-size="9" fill="#64748b"`)}
    ${svgText(x + w - 380, y + 48, objectLabel || "No Selection", `font-size="12" font-weight="700" fill="#0f172a"`)}
    ${svgText(x + w - 220, y + 16, "VIEW", `font-size="9" fill="#64748b"`)}
    ${svgText(x + w - 220, y + 48, viewLabel, `font-size="12" font-weight="700" fill="#0f172a"`)}
    ${svgText(x + w - 110, y + 16, "UNIT", `font-size="9" fill="#64748b"`)}
    ${svgText(x + w - 110, y + 48, unit.toUpperCase(), `font-size="12" font-weight="700" fill="#0f172a"`)}
    ${svgText(x + w - 380, y + 68, "MATERIAL", `font-size="9" fill="#64748b"`)}
    ${svgText(x + w - 380, y + 90, materialText || "—", `font-size="10" fill="#0f172a"`)}
    ${svgText(x + w - 220, y + 68, "DIMENSIONS", `font-size="9" fill="#64748b"`)}
    ${svgText(x + w - 220, y + 90, dimsText || "—", `font-size="10" fill="#0f172a"`)}
    ${svgText(x + w - 110, y + 68, "SCALE", `font-size="9" fill="#64748b"`)}
    ${svgText(x + w - 110, y + 90, scaleText, `font-size="10" fill="#0f172a"`)}
    ${svgText(x + 10, y + 68, "DATE", `font-size="9" fill="#64748b"`)}
    ${svgText(x + 10, y + 90, getNowStamp(), `font-size="10" fill="#0f172a"`)}
    ${svgText(x + 120, y + 68, "SHEET", `font-size="9" fill="#64748b"`)}
    ${svgText(x + 120, y + 90, sheetCode, `font-size="10" fill="#0f172a"`)}
  `;
}

function build2DViewPageSvg({
  selectedComponents,
  selectedComp,
  selectedLabel,
  selectedMaterialText,
  selectedBounds3D,
  selectedDimsText,
  blueprintTitle,
  unit,
  view,
  pageW = EXPORT_PAGE_W,
  pageH = EXPORT_PAGE_H,
}) {
  const { drawingArea, scaledItems, overallScreenBounds } =
    getScaledExportItems(selectedComponents, view, pageW, pageH);
  const viewLabel = VIEWS.find((v) => v.key === view)?.label || "View";

  const axisLabels =
    view === "left" || view === "right"
      ? ["Z (Depth)", "Y (Height)"]
      : view === "top"
        ? ["X (Width)", "Z (Depth)"]
        : view === "exploded"
          ? ["Exploded", "Parts"]
          : ["X (Width)", "Y (Height)"];

  const itemsMarkup = scaledItems
    .map(({ comp, screenBox }, idx) => {
      const selectedOutline =
        comp.id === selectedComp?.id
          ? svgRect(
              screenBox.x - 4,
              screenBox.y - 4,
              screenBox.w + 8,
              screenBox.h + 8,
              `fill="none" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="6 4"`,
            )
          : "";

      const labelMarkup =
        view === "exploded"
          ? `
            ${svgLine(
              screenBox.x + screenBox.w,
              screenBox.y + screenBox.h / 2,
              screenBox.x + screenBox.w + 30,
              screenBox.y + screenBox.h / 2,
              `stroke="#475569" stroke-width="1"`,
            )}
            ${svgText(
              screenBox.x + screenBox.w + 34,
              screenBox.y + screenBox.h / 2 - 2,
              `${comp.partCode || `P${idx + 1}`} — ${comp.label}`,
              `fill="#0f172a" font-size="10"`,
            )}
          `
          : svgText(
              screenBox.x + screenBox.w / 2,
              screenBox.y + screenBox.h + 16,
              comp.partCode || comp.label,
              `fill="#475569" font-size="9" text-anchor="middle"`,
            );

      return `
        <g transform="translate(${screenBox.x}, ${screenBox.y})">
          ${buildBlueprintSvgMarkup(comp, screenBox, view === "exploded" ? "front" : view)}
        </g>
        ${selectedOutline}
        ${labelMarkup}
      `;
    })
    .join("");

  const dimMarkup =
    selectedComp &&
    view !== "exploded" &&
    overallScreenBounds &&
    selectedBounds3D
      ? `
        ${buildSvgDimensionLine(
          overallScreenBounds.minX,
          overallScreenBounds.minY,
          overallScreenBounds.maxX,
          overallScreenBounds.minY,
          view === "left" || view === "right"
            ? formatDim(selectedBounds3D.depth, unit)
            : formatDim(selectedBounds3D.width, unit),
          "horizontal",
          24,
        )}
        ${buildSvgDimensionLine(
          overallScreenBounds.maxX,
          overallScreenBounds.minY,
          overallScreenBounds.maxX,
          overallScreenBounds.maxY,
          view === "top"
            ? formatDim(selectedBounds3D.depth, unit)
            : formatDim(selectedBounds3D.height, unit),
          "vertical",
          28,
        )}
        ${svgLine(
          drawingArea.x,
          (overallScreenBounds.minY + overallScreenBounds.maxY) / 2,
          drawingArea.x + drawingArea.w,
          (overallScreenBounds.minY + overallScreenBounds.maxY) / 2,
          `stroke="#cbd5e1" stroke-width="0.8" stroke-dasharray="4 4"`,
        )}
        ${svgLine(
          (overallScreenBounds.minX + overallScreenBounds.maxX) / 2,
          drawingArea.y,
          (overallScreenBounds.minX + overallScreenBounds.maxX) / 2,
          drawingArea.y + drawingArea.h,
          `stroke="#cbd5e1" stroke-width="0.8" stroke-dasharray="4 4"`,
        )}
        ${svgText(drawingArea.x + 8, drawingArea.y + drawingArea.h - 38, `PARTS: ${selectedComponents.length}`, `font-size="10" fill="#475569"`)}
        ${svgText(
          drawingArea.x + 8,
          drawingArea.y + drawingArea.h - 22,
          `SELECTED: ${selectedComp.partCode || selectedComp.label}`,
          `font-size="10" fill="#475569"`,
        )}
        ${svgText(
          drawingArea.x + drawingArea.w - 185,
          drawingArea.y + drawingArea.h - 38,
          `AXIS H: ${axisLabels[0]}`,
          `font-size="10" fill="#475569"`,
        )}
        ${svgText(
          drawingArea.x + drawingArea.w - 185,
          drawingArea.y + drawingArea.h - 22,
          `AXIS V: ${axisLabels[1]}`,
          `font-size="10" fill="#475569"`,
        )}
      `
      : view === "exploded"
        ? `
          ${svgText(drawingArea.x + 8, drawingArea.y + drawingArea.h - 38, `EXPLODED PARTS: ${selectedComponents.length}`, `font-size="10" fill="#475569"`)}
          ${svgText(drawingArea.x + 8, drawingArea.y + drawingArea.h - 22, "Blueprint exploded layout for fabrication and material reference.", `font-size="10" fill="#475569"`)}
        `
        : "";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${pageW}" height="${pageH}" viewBox="0 0 ${pageW} ${pageH}">
      ${buildSvgPaperMarkup(pageW, pageH)}
      ${svgText(PAPER_MARGIN + 12, PAPER_MARGIN + 22, `TECHNICAL BLUEPRINT — ${viewLabel.toUpperCase()}`, `font-size="12" font-weight="700" fill="#0f172a"`)}
      ${svgText(PAPER_MARGIN + 12, PAPER_MARGIN + 40, selectedLabel ? selectedLabel.toUpperCase() : "NO SELECTED OBJECT", `font-size="10" fill="#475569"`)}
      ${svgRect(drawingArea.x, drawingArea.y, drawingArea.w, drawingArea.h, `fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="5 5"`)}
      ${itemsMarkup}
      ${dimMarkup}
      ${buildSvgTitleBlockMarkup({
        pageW,
        pageH,
        blueprintTitle,
        objectLabel: selectedLabel,
        viewLabel,
        materialText: selectedMaterialText,
        dimsText: selectedDimsText,
        unit,
        scaleText: "NTS",
        sheetCode: getViewSheetCode(view),
      })}
    </svg>
  `;
}

function build3DViewPageSvg({
  selectedComponents,
  selectedLabel,
  selectedMaterialText,
  selectedBounds3D,
  selectedDimsText,
  blueprintTitle,
  unit,
  pageW = EXPORT_PAGE_W,
  pageH = EXPORT_PAGE_H,
}) {
  const drawingArea = getExportDrawingArea(pageW, pageH);
  const bounds = getComponentsBounds3D(selectedComponents);

  if (!bounds) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${pageW}" height="${pageH}" viewBox="0 0 ${pageW} ${pageH}">
        ${buildSvgPaperMarkup(pageW, pageH)}
        ${svgText(pageW / 2, pageH / 2, "NO COMPONENTS TO EXPORT", `font-size="20" fill="#64748b" text-anchor="middle"`)}
      </svg>
    `;
  }

  const iso = (x, y, z) => {
    const localX = x - bounds.minX;
    const localZ = z - bounds.minZ;
    const worldTop = bounds.maxY - y;
    return {
      x: (localX - localZ) * 0.866,
      y: (localX + localZ) * 0.5 - worldTop,
    };
  };

  const corners = [];
  selectedComponents.forEach((comp) => {
    const pts = [
      iso(comp.x, comp.y, comp.z),
      iso(comp.x + comp.width, comp.y, comp.z),
      iso(comp.x + comp.width, comp.y, comp.z + comp.depth),
      iso(comp.x, comp.y, comp.z + comp.depth),
      iso(comp.x, comp.y + comp.height, comp.z),
      iso(comp.x + comp.width, comp.y + comp.height, comp.z),
      iso(comp.x + comp.width, comp.y + comp.height, comp.z + comp.depth),
      iso(comp.x, comp.y + comp.height, comp.z + comp.depth),
    ];
    corners.push(...pts);
  });

  const minPx = Math.min(...corners.map((p) => p.x));
  const maxPx = Math.max(...corners.map((p) => p.x));
  const minPy = Math.min(...corners.map((p) => p.y));
  const maxPy = Math.max(...corners.map((p) => p.y));

  const scale =
    Math.min(
      drawingArea.w / Math.max(1, maxPx - minPx),
      drawingArea.h / Math.max(1, maxPy - minPy),
    ) * 0.9;

  const offsetX = drawingArea.x + (drawingArea.w - (maxPx - minPx) * scale) / 2;
  const offsetY = drawingArea.y + (drawingArea.h - (maxPy - minPy) * scale) / 2;

  const project = (x, y, z) => {
    const p = iso(x, y, z);
    return {
      x: offsetX + (p.x - minPx) * scale,
      y: offsetY + (p.y - minPy) * scale,
    };
  };

  const compOrder = [...selectedComponents].sort(
    (a, b) => a.x + a.z + a.y * 0.2 - (b.x + b.z + b.y * 0.2),
  );

  const shapes = compOrder
    .map((comp) => {
      const stroke = getBlueprintStroke(comp);

      const p000 = project(comp.x, comp.y + comp.height, comp.z);
      const p100 = project(comp.x + comp.width, comp.y + comp.height, comp.z);
      const p110 = project(
        comp.x + comp.width,
        comp.y + comp.height,
        comp.z + comp.depth,
      );
      const p010 = project(comp.x, comp.y + comp.height, comp.z + comp.depth);

      const p001 = project(comp.x, comp.y, comp.z);
      const p101 = project(comp.x + comp.width, comp.y, comp.z);
      const p111 = project(comp.x + comp.width, comp.y, comp.z + comp.depth);
      const p011 = project(comp.x, comp.y, comp.z + comp.depth);

      const top = `${p001.x},${p001.y} ${p101.x},${p101.y} ${p111.x},${p111.y} ${p011.x},${p011.y}`;
      const left = `${p001.x},${p001.y} ${p011.x},${p011.y} ${p010.x},${p010.y} ${p000.x},${p000.y}`;
      const right = `${p001.x},${p001.y} ${p101.x},${p101.y} ${p100.x},${p100.y} ${p000.x},${p000.y}`;

      const labelAnchor = project(
        comp.x + comp.width / 2,
        comp.y,
        comp.z + comp.depth / 2,
      );

      return `
        <polygon points="${top}" fill="#f8fafc" stroke="${stroke}" stroke-width="1.1" />
        <polygon points="${left}" fill="#ffffff" stroke="${stroke}" stroke-width="1.1" opacity="0.92" />
        <polygon points="${right}" fill="#ffffff" stroke="${stroke}" stroke-width="1.1" opacity="0.96" />
        ${svgText(labelAnchor.x, labelAnchor.y - 6, comp.partCode || comp.label, `font-size="9" fill="#334155" text-anchor="middle"`)}
      `;
    })
    .join("");

  const dimBase = {
    x: drawingArea.x + 26,
    y: drawingArea.y + drawingArea.h - 44,
  };

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${pageW}" height="${pageH}" viewBox="0 0 ${pageW} ${pageH}">
      ${buildSvgPaperMarkup(pageW, pageH)}
      ${svgText(PAPER_MARGIN + 12, PAPER_MARGIN + 22, "TECHNICAL BLUEPRINT — 3D ISOMETRIC VIEW", `font-size="12" font-weight="700" fill="#0f172a"`)}
      ${svgText(PAPER_MARGIN + 12, PAPER_MARGIN + 40, selectedLabel ? selectedLabel.toUpperCase() : "NO SELECTED OBJECT", `font-size="10" fill="#475569"`)}
      ${svgRect(drawingArea.x, drawingArea.y, drawingArea.w, drawingArea.h, `fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="5 5"`)}
      ${shapes}
      ${svgText(dimBase.x, dimBase.y, `WIDTH: ${formatDim(selectedBounds3D?.width || 0, unit)}`, `font-size="10" fill="#475569"`)}
      ${svgText(dimBase.x, dimBase.y + 16, `HEIGHT: ${formatDim(selectedBounds3D?.height || 0, unit)}`, `font-size="10" fill="#475569"`)}
      ${svgText(dimBase.x, dimBase.y + 32, `DEPTH: ${formatDim(selectedBounds3D?.depth || 0, unit)}`, `font-size="10" fill="#475569"`)}
      ${buildSvgTitleBlockMarkup({
        pageW,
        pageH,
        blueprintTitle,
        objectLabel: selectedLabel,
        viewLabel: "3D View",
        materialText: selectedMaterialText,
        dimsText: selectedDimsText,
        unit,
        scaleText: "NTS",
        sheetCode: getViewSheetCode("3d"),
      })}
    </svg>
  `;
}

function getMaterialsSummary(components) {
  const byMaterial = new Map();
  const byComponent = [];

  components.forEach((c) => {
    const key = c.material || "Unspecified";
    if (!byMaterial.has(key)) {
      byMaterial.set(key, {
        material: key,
        qty: 0,
        estimatedCost: 0,
      });
    }

    const entry = byMaterial.get(key);
    entry.qty += Number(c.qty || 1);
    entry.estimatedCost += Number(c.qty || 1) * Number(c.unitPrice || 0);

    byComponent.push({
      partCode: c.partCode || "—",
      label: c.label,
      material: c.material || "—",
      qty: Number(c.qty || 1),
      size: formatDims(c.width, c.height, c.depth, "mm"),
      price: Number(c.qty || 1) * Number(c.unitPrice || 0),
    });
  });

  return {
    materialRows: [...byMaterial.values()],
    componentRows: byComponent,
  };
}

function buildMaterialsPageHtml({
  selectedComponents,
  selectedLabel,
  selectedDimsText,
  selectedMaterialText,
  blueprintTitle,
  unit,
}) {
  const { materialRows, componentRows } =
    getMaterialsSummary(selectedComponents);

  const materialTable = `
    <table class="bp-table">
      <thead>
        <tr>
          <th>Material</th>
          <th>Qty</th>
          <th>Estimated Cost</th>
        </tr>
      </thead>
      <tbody>
        ${materialRows
          .map(
            (row) => `
          <tr>
            <td>${escapeHtml(row.material)}</td>
            <td>${row.qty}</td>
            <td>₱ ${row.estimatedCost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;

  const partTable = `
    <table class="bp-table">
      <thead>
        <tr>
          <th>Part Code</th>
          <th>Description</th>
          <th>Material</th>
          <th>Qty</th>
          <th>Dimensions</th>
          <th>Cost</th>
        </tr>
      </thead>
      <tbody>
        ${componentRows
          .map(
            (row) => `
          <tr>
            <td>${escapeHtml(row.partCode)}</td>
            <td>${escapeHtml(row.label)}</td>
            <td>${escapeHtml(row.material)}</td>
            <td>${row.qty}</td>
            <td>${escapeHtml(row.size)}</td>
            <td>₱ ${row.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;

  return `
    <div class="page">
      <div class="page-inner">
        <div class="sheet-header">
          <div>
            <div class="sheet-title">TECHNICAL BLUEPRINT — MATERIALS / BILL OF MATERIALS</div>
            <div class="sheet-subtitle">${escapeHtml(selectedLabel || "No Selection")}</div>
          </div>
          <div class="sheet-meta">
            <div><b>Unit:</b> ${escapeHtml(unit.toUpperCase())}</div>
            <div><b>Sheet:</b> A-108</div>
            <div><b>Date:</b> ${escapeHtml(getNowStamp())}</div>
          </div>
        </div>

        <div class="info-grid">
          <div><b>Project:</b> ${escapeHtml(blueprintTitle || "Blueprint Design")}</div>
          <div><b>Object:</b> ${escapeHtml(selectedLabel || "No Selection")}</div>
          <div><b>Dimensions:</b> ${escapeHtml(selectedDimsText || "—")}</div>
          <div><b>Materials:</b> ${escapeHtml(selectedMaterialText || "—")}</div>
        </div>

        <h3 class="section-head">Materials Summary</h3>
        ${materialTable}

        <h3 class="section-head">Parts / Components List</h3>
        ${partTable}
      </div>
    </div>
  `;
}

function buildSvgPageHtml(svgMarkup) {
  return `
    <div class="page">
      <div class="page-inner svg-page">
        ${svgMarkup}
      </div>
    </div>
  `;
}

function buildBlueprintDocumentHtml(pages) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Blueprint Sheets</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #cbd5e1;
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
          }
          .page {
            width: ${EXPORT_PAGE_W}px;
            min-height: ${EXPORT_PAGE_H}px;
            margin: 18px auto;
            background: #fff;
            box-shadow: 0 6px 28px rgba(0,0,0,.18);
            page-break-after: always;
            break-after: page;
          }
          .page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .page-inner {
            width: 100%;
            min-height: ${EXPORT_PAGE_H}px;
            padding: 0;
          }
          .svg-page {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .sheet-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 30px 34px 12px;
            border-bottom: 2px solid #0f172a;
          }
          .sheet-title {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: .5px;
          }
          .sheet-subtitle {
            font-size: 12px;
            color: #475569;
            margin-top: 4px;
          }
          .sheet-meta {
            font-size: 12px;
            line-height: 1.8;
            text-align: right;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 20px;
            padding: 16px 34px;
            font-size: 12px;
            border-bottom: 1px solid #cbd5e1;
          }
          .section-head {
            margin: 18px 34px 8px;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: .8px;
            color: #334155;
          }
          .bp-table {
            width: calc(100% - 68px);
            margin: 0 34px 18px;
            border-collapse: collapse;
            font-size: 12px;
          }
          .bp-table th,
          .bp-table td {
            border: 1px solid #94a3b8;
            padding: 7px 8px;
            vertical-align: top;
          }
          .bp-table th {
            background: #e2e8f0;
            text-align: left;
          }
          @page {
            size: ${EXPORT_PAGE_W}px ${EXPORT_PAGE_H}px;
            margin: 0;
          }
          @media print {
            body {
              background: #fff;
            }
            .page {
              margin: 0;
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        ${pages.join("")}
      </body>
    </html>
  `;
}

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

function buildAllExportPages({
  exportComponents,
  selectedComp,
  selectedLabel,
  selectedMaterialText,
  selectedBounds3D,
  selectedDimsText,
  blueprintTitle,
  unit,
}) {
  const pages = [];

  pages.push(
    buildSvgPageHtml(
      build3DViewPageSvg({
        selectedComponents: exportComponents,
        selectedLabel,
        selectedMaterialText,
        selectedBounds3D,
        selectedDimsText,
        blueprintTitle,
        unit,
      }),
    ),
  );

  ["front", "back", "left", "right", "top", "exploded"].forEach((view) => {
    pages.push(
      buildSvgPageHtml(
        build2DViewPageSvg({
          selectedComponents: exportComponents,
          selectedComp,
          selectedLabel,
          selectedMaterialText,
          selectedBounds3D,
          selectedDimsText,
          blueprintTitle,
          unit,
          view,
        }),
      ),
    );
  });

  pages.push(
    buildMaterialsPageHtml({
      selectedComponents: exportComponents,
      selectedLabel,
      selectedDimsText,
      selectedMaterialText,
      blueprintTitle,
      unit,
    }),
  );

  return pages;
}
export {
  svgLine,
  svgRect,
  build2DViewPageSvg,
  buildSvgPaperMarkup,
  buildMaterialsPageHtml,
  buildBlueprintDocumentHtml,
  buildAllExportPages,
};
