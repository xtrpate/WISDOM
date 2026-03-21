// 2d/blueprintComponents.jsx — React components for 2D blueprint display
import React, { useMemo, useRef } from "react";
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
import {
  getComponentsBounds3D,
  get2DBounds,
  getProjectedBox,
  shouldMirrorView,
  getMirroredBox,
} from "../data/componentUtils";
import {
  snap,
  clamp,
  mmToDisplay,
  formatDim,
  getNowStamp,
  isImageReferenceFile,
  resolveAssetUrl,
} from "../data/utils";
import { useReferenceImage } from "../data/initHelpers";
import { renderBlueprintShape } from "./render2D";
import {
  VIEWS,
  CHAIR_PART_SET,
  CASEWORK_SET,
  WOOD_FINISHES,
} from "../data/furnitureTypes";
import S from "../styles/blueprintStyles";
import { getExplodedBox } from "../export/placementHelpers";

const GRID_SIZE = 20;
const PAPER_MARGIN = 28;
const TITLE_BLOCK_H = 96;
const DRAWING_PADDING = 56;
const MM_PER_INCH = 25.4;

function DimensionLine({
  x1,
  y1,
  x2,
  y2,
  offset = 24,
  text,
  orientation = "horizontal",
}) {
  const dimColor = "#0f172a";
  const extColor = "#475569";

  if (orientation === "horizontal") {
    const y = y1 - offset;
    return (
      <Group listening={false}>
        <Line points={[x1, y1, x1, y]} stroke={extColor} strokeWidth={1} />
        <Line points={[x2, y2, x2, y]} stroke={extColor} strokeWidth={1} />
        <Arrow
          points={[x1, y, x2, y]}
          stroke={dimColor}
          fill={dimColor}
          strokeWidth={1}
          pointerLength={6}
          pointerWidth={5}
          pointerAtBeginning
          pointerAtEnding
        />
        <Text
          x={(x1 + x2) / 2 - 60}
          y={y - 15}
          width={120}
          align="center"
          text={text}
          fontSize={10}
          fill={dimColor}
        />
      </Group>
    );
  }

  const x = x1 + offset;
  return (
    <Group listening={false}>
      <Line points={[x1, y1, x, y1]} stroke={extColor} strokeWidth={1} />
      <Line points={[x2, y2, x, y2]} stroke={extColor} strokeWidth={1} />
      <Arrow
        points={[x, y1, x, y2]}
        stroke={dimColor}
        fill={dimColor}
        strokeWidth={1}
        pointerLength={6}
        pointerWidth={5}
        pointerAtBeginning
        pointerAtEnding
      />
      <Text
        x={x + 6}
        y={(y1 + y2) / 2 - 6}
        text={text}
        fontSize={10}
        fill={dimColor}
      />
    </Group>
  );
}

function BlueprintTitleBlock({
  canvasW,
  canvasH,
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
  const y = canvasH - PAPER_MARGIN - TITLE_BLOCK_H;
  const w = canvasW - PAPER_MARGIN * 2;
  const h = TITLE_BLOCK_H;

  return (
    <Group listening={false}>
      <Rect
        x={x}
        y={y}
        width={w}
        height={h}
        stroke="#0f172a"
        strokeWidth={1.4}
        fill="#ffffff"
      />
      <Line
        points={[x + w - 390, y, x + w - 390, y + h]}
        stroke="#0f172a"
        strokeWidth={1}
      />
      <Line
        points={[x + w - 230, y, x + w - 230, y + h]}
        stroke="#0f172a"
        strokeWidth={1}
      />
      <Line
        points={[x + w - 120, y, x + w - 120, y + h]}
        stroke="#0f172a"
        strokeWidth={1}
      />
      <Line
        points={[x, y + 32, x + w, y + 32]}
        stroke="#0f172a"
        strokeWidth={1}
      />
      <Line
        points={[x + w - 390, y + 54, x + w, y + 54]}
        stroke="#0f172a"
        strokeWidth={1}
      />
      <Line
        points={[x + w - 390, y + 76, x + w, y + 76]}
        stroke="#0f172a"
        strokeWidth={1}
      />

      <Text
        x={x + 10}
        y={y + 8}
        text="PROJECT / BLUEPRINT TITLE"
        fontSize={9}
        fill="#64748b"
      />
      <Text
        x={x + 10}
        y={y + 36}
        text={blueprintTitle || "Blueprint Design"}
        fontSize={15}
        fontStyle="bold"
        fill="#0f172a"
      />
      <Text
        x={x + w - 380}
        y={y + 8}
        text="OBJECT"
        fontSize={9}
        fill="#64748b"
      />
      <Text
        x={x + w - 380}
        y={y + 36}
        text={objectLabel || "No Selection"}
        fontSize={12}
        fontStyle="bold"
        fill="#0f172a"
      />
      <Text x={x + w - 220} y={y + 8} text="VIEW" fontSize={9} fill="#64748b" />
      <Text
        x={x + w - 220}
        y={y + 36}
        text={viewLabel}
        fontSize={12}
        fontStyle="bold"
        fill="#0f172a"
      />
      <Text x={x + w - 110} y={y + 8} text="UNIT" fontSize={9} fill="#64748b" />
      <Text
        x={x + w - 110}
        y={y + 36}
        text={unit.toUpperCase()}
        fontSize={12}
        fontStyle="bold"
        fill="#0f172a"
      />
      <Text
        x={x + w - 380}
        y={y + 58}
        text="MATERIAL"
        fontSize={9}
        fill="#64748b"
      />
      <Text
        x={x + w - 380}
        y={y + 80}
        text={materialText || "—"}
        fontSize={10}
        fill="#0f172a"
      />
      <Text
        x={x + w - 220}
        y={y + 58}
        text="DIMENSIONS"
        fontSize={9}
        fill="#64748b"
      />
      <Text
        x={x + w - 220}
        y={y + 80}
        text={dimsText || "—"}
        fontSize={10}
        fill="#0f172a"
      />
      <Text
        x={x + w - 110}
        y={y + 58}
        text="SCALE"
        fontSize={9}
        fill="#64748b"
      />
      <Text
        x={x + w - 110}
        y={y + 80}
        text={scaleText}
        fontSize={10}
        fill="#0f172a"
      />
      <Text x={x + 10} y={y + 58} text="DATE" fontSize={9} fill="#64748b" />
      <Text
        x={x + 10}
        y={y + 80}
        text={getNowStamp()}
        fontSize={10}
        fill="#0f172a"
      />
      <Text x={x + 120} y={y + 58} text="SHEET" fontSize={9} fill="#64748b" />
      <Text
        x={x + 120}
        y={y + 80}
        text={sheetCode}
        fontSize={10}
        fill="#0f172a"
      />
    </Group>
  );
}

function BlueprintPaper({ canvasW, canvasH }) {
  const refStep = 80;
  const refs = [];

  for (
    let x = PAPER_MARGIN + refStep;
    x < canvasW - PAPER_MARGIN;
    x += refStep
  ) {
    refs.push(
      <Text
        key={`top-${x}`}
        x={x - 4}
        y={PAPER_MARGIN - 16}
        text={`${Math.round((x - PAPER_MARGIN) / refStep)}`}
        fontSize={9}
        fill="#64748b"
        listening={false}
      />,
    );
  }

  for (
    let y = PAPER_MARGIN + refStep;
    y < canvasH - PAPER_MARGIN - TITLE_BLOCK_H;
    y += refStep
  ) {
    refs.push(
      <Text
        key={`left-${y}`}
        x={PAPER_MARGIN - 18}
        y={y - 4}
        text={String.fromCharCode(
          64 + Math.round((y - PAPER_MARGIN) / refStep),
        )}
        fontSize={9}
        fill="#64748b"
        listening={false}
      />,
    );
  }

  return (
    <Group listening={false}>
      <Rect x={0} y={0} width={canvasW} height={canvasH} fill="#ffffff" />
      <Rect
        x={PAPER_MARGIN}
        y={PAPER_MARGIN}
        width={canvasW - PAPER_MARGIN * 2}
        height={canvasH - PAPER_MARGIN * 2}
        stroke="#0f172a"
        strokeWidth={1.6}
      />
      <Rect
        x={PAPER_MARGIN + 8}
        y={PAPER_MARGIN + 8}
        width={canvasW - PAPER_MARGIN * 2 - 16}
        height={canvasH - PAPER_MARGIN * 2 - 16}
        stroke="#94a3b8"
        strokeWidth={0.8}
      />
      {refs}
    </Group>
  );
}

function Canvas2D({
  selectedComp,
  selectedComponents,
  allComponents,
  selectedLabel,
  selectedMaterialText,
  selectedDimsText,
  selectedBounds3D,
  view,
  canvasW,
  canvasH,
  showGrid,
  blueprintTitle,
  unit,
  referenceFile,
}) {
  const drawingArea = {
    x: PAPER_MARGIN + DRAWING_PADDING,
    y: PAPER_MARGIN + DRAWING_PADDING,
    w: canvasW - PAPER_MARGIN * 2 - DRAWING_PADDING * 2,
    h: canvasH - PAPER_MARGIN * 2 - TITLE_BLOCK_H - DRAWING_PADDING * 1.45,
  };

  const referenceUrl = useMemo(
    () => resolveAssetUrl(referenceFile?.url || ""),
    [referenceFile],
  );

  const referenceImage = useReferenceImage(
    isImageReferenceFile(referenceFile) ? referenceUrl : "",
  );

  const previewComponents = useMemo(() => {
    if (selectedComponents.length) return selectedComponents;
    if (allComponents.length) return allComponents;
    return [];
  }, [selectedComponents, allComponents]);

  const referenceType = String(
    referenceFile?.type || referenceFile?.file_type || "",
  ).toLowerCase();
  const isPdfReference = referenceType === "pdf";

  const referenceImageBox = useMemo(() => {
    if (!referenceImage) return null;

    const imgW = Number(referenceImage.width) || 1;
    const imgH = Number(referenceImage.height) || 1;
    const scale = Math.min(drawingArea.w / imgW, drawingArea.h / imgH);

    const width = imgW * scale;
    const height = imgH * scale;

    return {
      x: drawingArea.x + (drawingArea.w - width) / 2,
      y: drawingArea.y + (drawingArea.h - height) / 2,
      w: width,
      h: height,
    };
  }, [referenceImage, drawingArea]);

  const rawItems = useMemo(() => {
    if (!previewComponents.length) return [];

    if (view === "exploded") {
      return previewComponents.map((comp, index) => ({
        comp,
        box: getExplodedBox(comp, previewComponents, index),
      }));
    }

    const projected = previewComponents
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
  }, [previewComponents, view]);

  const bounds2D = useMemo(() => get2DBounds(rawItems), [rawItems]);

  const scaledItems = useMemo(() => {
    if (!bounds2D) return [];

    const scale = Math.min(
      drawingArea.w / Math.max(bounds2D.width, 1),
      drawingArea.h / Math.max(bounds2D.height, 1),
      view === "exploded" ? 0.96 : 1.1,
    );

    const offsetX =
      drawingArea.x + (drawingArea.w - bounds2D.width * scale) / 2;
    const offsetY =
      drawingArea.y + (drawingArea.h - bounds2D.height * scale) / 2;

    return rawItems.map((item) => ({
      ...item,
      screenBox: {
        x: offsetX + (item.box.x - bounds2D.minX) * scale,
        y: offsetY + (item.box.y - bounds2D.minY) * scale,
        w: Math.max(8, item.box.w * scale),
        h: Math.max(8, item.box.h * scale),
      },
      scale,
    }));
  }, [rawItems, bounds2D, drawingArea, view]);

  const gridLines = () => {
    if (!showGrid) return [];
    const lines = [];

    for (let x = drawingArea.x; x <= drawingArea.x + drawingArea.w; x += 20) {
      lines.push(
        <Line
          key={`gx${x}`}
          points={[x, drawingArea.y, x, drawingArea.y + drawingArea.h]}
          stroke="#e5e7eb"
          strokeWidth={0.5}
          listening={false}
        />,
      );
    }

    for (let y = drawingArea.y; y <= drawingArea.y + drawingArea.h; y += 20) {
      lines.push(
        <Line
          key={`gy${y}`}
          points={[drawingArea.x, y, drawingArea.x + drawingArea.w, y]}
          stroke="#e5e7eb"
          strokeWidth={0.5}
          listening={false}
        />,
      );
    }

    return lines;
  };

  const viewMeta = VIEWS.find((v) => v.key === view) || VIEWS[0];
  const viewLabel = viewMeta.label;

  const axisLabels =
    view === "left" || view === "right"
      ? ["Z (Depth)", "Y (Height)"]
      : view === "top"
        ? ["X (Width)", "Z (Depth)"]
        : view === "exploded"
          ? ["Exploded", "Parts"]
          : ["X (Width)", "Y (Height)"];

  const overallScreenBounds = useMemo(() => {
    if (!scaledItems.length) return null;
    return {
      minX: Math.min(...scaledItems.map((i) => i.screenBox.x)),
      minY: Math.min(...scaledItems.map((i) => i.screenBox.y)),
      maxX: Math.max(...scaledItems.map((i) => i.screenBox.x + i.screenBox.w)),
      maxY: Math.max(...scaledItems.map((i) => i.screenBox.y + i.screenBox.h)),
    };
  }, [scaledItems]);

  const verticalDimText =
    view === "top"
      ? formatDim(selectedBounds3D?.depth || 0, unit)
      : formatDim(selectedBounds3D?.height || 0, unit);

  return (
    <Stage width={canvasW} height={canvasH}>
      <Layer>
        <BlueprintPaper canvasW={canvasW} canvasH={canvasH} />
        {referenceImage && referenceImageBox && (
          <Group listening={false}>
            <KonvaImage
              image={referenceImage}
              x={referenceImageBox.x}
              y={referenceImageBox.y}
              width={referenceImageBox.w}
              height={referenceImageBox.h}
              opacity={0.18}
            />
            <Rect
              x={referenceImageBox.x}
              y={referenceImageBox.y}
              width={referenceImageBox.w}
              height={referenceImageBox.h}
              stroke="#cbd5e1"
              strokeWidth={1}
              dash={[4, 4]}
            />
            <Text
              x={referenceImageBox.x + 8}
              y={referenceImageBox.y + 8}
              text="REFERENCE IMAGE"
              fontSize={9}
              fill="#64748b"
            />
          </Group>
        )}

        {gridLines()}

        <Text
          x={PAPER_MARGIN + 12}
          y={PAPER_MARGIN + 10}
          text={`TECHNICAL BLUEPRINT — ${viewLabel.toUpperCase()}`}
          fontSize={12}
          fill="#0f172a"
          fontStyle="bold"
          listening={false}
        />

        <Text
          x={PAPER_MARGIN + 12}
          y={PAPER_MARGIN + 28}
          text={
            selectedLabel ? selectedLabel.toUpperCase() : "NO SELECTED OBJECT"
          }
          fontSize={10}
          fill="#475569"
          listening={false}
        />

        <Rect
          x={drawingArea.x}
          y={drawingArea.y}
          width={drawingArea.w}
          height={drawingArea.h}
          stroke="#cbd5e1"
          strokeWidth={1}
          dash={[5, 5]}
          listening={false}
        />

        {!scaledItems.length && !referenceImage && !isPdfReference && (
          <Group listening={false}>
            <Text
              x={drawingArea.x}
              y={drawingArea.y + drawingArea.h / 2 - 12}
              width={drawingArea.w}
              align="center"
              text="SELECT AN OBJECT FROM 3D VIEW"
              fontSize={16}
              fill="#94a3b8"
              fontStyle="bold"
            />
            <Text
              x={drawingArea.x}
              y={drawingArea.y + drawingArea.h / 2 + 12}
              width={drawingArea.w}
              align="center"
              text="Blueprint preview will appear here."
              fontSize={11}
              fill="#94a3b8"
            />
          </Group>
        )}
        {!scaledItems.length && !referenceImage && isPdfReference && (
          <Group listening={false}>
            <Rect
              x={drawingArea.x + 40}
              y={drawingArea.y + 40}
              width={drawingArea.w - 80}
              height={drawingArea.h - 80}
              stroke="#cbd5e1"
              strokeWidth={1}
              dash={[6, 4]}
              cornerRadius={8}
            />
            <Text
              x={drawingArea.x}
              y={drawingArea.y + drawingArea.h / 2 - 18}
              width={drawingArea.w}
              align="center"
              text="REFERENCE PDF LOADED"
              fontSize={16}
              fill="#64748b"
              fontStyle="bold"
            />
            <Text
              x={drawingArea.x}
              y={drawingArea.y + drawingArea.h / 2 + 8}
              width={drawingArea.w}
              align="center"
              text="PDF preview is not rendered on the canvas. Click 'Open Reference' to view the file."
              fontSize={11}
              fill="#94a3b8"
            />
          </Group>
        )}

        {scaledItems.map(({ comp, screenBox }, idx) => {
          const isSelected = comp.id === selectedComp?.id;
          const renderView = view === "exploded" ? "front" : view;

          return (
            <Group key={comp.id}>
              <Group x={screenBox.x} y={screenBox.y}>
                {renderBlueprintShape(comp, renderView, screenBox)}
                {isSelected && (
                  <Rect
                    x={-4}
                    y={-4}
                    width={screenBox.w + 8}
                    height={screenBox.h + 8}
                    stroke="#2563eb"
                    strokeWidth={1.5}
                    dash={[6, 4]}
                    listening={false}
                  />
                )}
              </Group>

              {view === "exploded" ? (
                <>
                  <Line
                    points={[
                      screenBox.x + screenBox.w,
                      screenBox.y + screenBox.h / 2,
                      screenBox.x + screenBox.w + 30,
                      screenBox.y + screenBox.h / 2,
                    ]}
                    stroke="#475569"
                    strokeWidth={1}
                    listening={false}
                  />
                  <Text
                    x={screenBox.x + screenBox.w + 34}
                    y={screenBox.y + screenBox.h / 2 - 8}
                    text={`${comp.partCode || `P${idx + 1}`} — ${comp.label}`}
                    fontSize={10}
                    fill="#0f172a"
                    listening={false}
                  />
                </>
              ) : (
                <Text
                  x={screenBox.x}
                  y={screenBox.y + screenBox.h + 6}
                  width={screenBox.w}
                  align="center"
                  text={comp.partCode || comp.label}
                  fontSize={9}
                  fill="#475569"
                  listening={false}
                />
              )}
            </Group>
          );
        })}

        {selectedComp &&
          view !== "exploded" &&
          overallScreenBounds &&
          selectedBounds3D && (
            <>
              <DimensionLine
                x1={overallScreenBounds.minX}
                y1={overallScreenBounds.minY}
                x2={overallScreenBounds.maxX}
                y2={overallScreenBounds.minY}
                offset={24}
                text={
                  view === "left" || view === "right"
                    ? formatDim(selectedBounds3D.depth, unit)
                    : formatDim(selectedBounds3D.width, unit)
                }
                orientation="horizontal"
              />

              <DimensionLine
                x1={overallScreenBounds.maxX}
                y1={overallScreenBounds.minY}
                x2={overallScreenBounds.maxX}
                y2={overallScreenBounds.maxY}
                offset={28}
                text={verticalDimText}
                orientation="vertical"
              />

              <Line
                points={[
                  drawingArea.x,
                  (overallScreenBounds.minY + overallScreenBounds.maxY) / 2,
                  drawingArea.x + drawingArea.w,
                  (overallScreenBounds.minY + overallScreenBounds.maxY) / 2,
                ]}
                stroke="#cbd5e1"
                strokeWidth={0.8}
                dash={[4, 4]}
                listening={false}
              />

              <Line
                points={[
                  (overallScreenBounds.minX + overallScreenBounds.maxX) / 2,
                  drawingArea.y,
                  (overallScreenBounds.minX + overallScreenBounds.maxX) / 2,
                  drawingArea.y + drawingArea.h,
                ]}
                stroke="#cbd5e1"
                strokeWidth={0.8}
                dash={[4, 4]}
                listening={false}
              />

              <Text
                x={drawingArea.x + 8}
                y={drawingArea.y + drawingArea.h - 40}
                text={`PARTS: ${selectedComponents.length}`}
                fontSize={10}
                fill="#475569"
                listening={false}
              />

              <Text
                x={drawingArea.x + 8}
                y={drawingArea.y + drawingArea.h - 24}
                text={`SELECTED: ${selectedComp.partCode || selectedComp.label}`}
                fontSize={10}
                fill="#475569"
                listening={false}
              />

              <Text
                x={drawingArea.x + drawingArea.w - 185}
                y={drawingArea.y + drawingArea.h - 40}
                text={`AXIS H: ${axisLabels[0]}`}
                fontSize={10}
                fill="#475569"
                listening={false}
              />

              <Text
                x={drawingArea.x + drawingArea.w - 185}
                y={drawingArea.y + drawingArea.h - 24}
                text={`AXIS V: ${axisLabels[1]}`}
                fontSize={10}
                fill="#475569"
                listening={false}
              />
            </>
          )}

        {selectedComp && view === "exploded" && (
          <>
            <Text
              x={drawingArea.x + 8}
              y={drawingArea.y + drawingArea.h - 40}
              text={`EXPLODED PARTS: ${selectedComponents.length}`}
              fontSize={10}
              fill="#475569"
              listening={false}
            />
            <Text
              x={drawingArea.x + 8}
              y={drawingArea.y + drawingArea.h - 24}
              text="Blueprint exploded layout for fabrication and material reference."
              fontSize={10}
              fill="#475569"
              listening={false}
            />
          </>
        )}

        <BlueprintTitleBlock
          canvasW={canvasW}
          canvasH={canvasH}
          blueprintTitle={blueprintTitle}
          objectLabel={selectedLabel}
          viewLabel={viewLabel}
          materialText={selectedMaterialText}
          dimsText={selectedDimsText}
          unit={unit}
          scaleText="NTS"
          sheetCode={viewMeta.sheet}
        />
      </Layer>
    </Stage>
  );
}

export { DimensionLine, BlueprintTitleBlock, BlueprintPaper, Canvas2D };
