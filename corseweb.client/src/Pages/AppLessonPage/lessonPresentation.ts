import type { CSSProperties } from "react";
import type { CanvasNode, LessonPresentation } from "../../types/course";

const STUDENT_CONTENT_TYPES = new Set<CanvasNode["type"]>([
  "heading", "paragraph", "list", "image", "video", "code", "quiz", "exercise",
  "callout", "divider", "embed", "certificate",
]);

function normalizeScriptToken(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isInternalScriptNode(node: CanvasNode): boolean {
  const props = node.props ?? {};
  const nodeType = normalizeScriptToken(node.type);
  const role = normalizeScriptToken(props.role ?? props.kind ?? props.contentType);
  const language = normalizeScriptToken(props.language ?? props.scriptLanguage ?? props.languageId ?? props.lang);

  const scriptNode = ["script", "clscript", "corselight", "corselightscript"].includes(nodeType);
  const explicitlyInternal = props.isScript === true
    || props.isInternal === true
    || props.visibleToStudent === false
    || role === "script"
    || role === "internal"
    || role === "corselightscript";
  const isCorseLight = language === "cl"
    || language === "cl01"
    || language === "clv01"
    || language === "clv1"
    || language === "corselight"
    || language === "corselight01"
    || language === "corselightv01"
    || language.startsWith("corselight");

  return scriptNode || explicitlyInternal || (nodeType === "code" && isCorseLight);
}

export function isStudentVisibleNode(node: CanvasNode): boolean {
  return STUDENT_CONTENT_TYPES.has(node.type) && !isInternalScriptNode(node);
}

const SAFE_HEX_COLOR = /^#[0-9a-f]{6}$/i;

function safeColor(value: unknown): string | undefined {
  return typeof value === "string" && SAFE_HEX_COLOR.test(value.trim()) ? value.trim() : undefined;
}

function safeFontFamily(value: unknown): CSSProperties["fontFamily"] {
  if (value === "serif") return "Georgia, 'Times New Roman', serif";
  if (value === "mono") return "ui-monospace, SFMono-Regular, Consolas, monospace";
  if (value === "sans") return "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  return undefined;
}

/** Convert only values defined by the content contract into CSS. */
export function getNodePresentationStyle(node: CanvasNode): CSSProperties {
  const style = node.style ?? {};
  const layout = node.layout ?? {};
  const result: CSSProperties = {};
  const customProperties: Record<string, string> = {};
  const color = safeColor(style.color);
  const backgroundColor = safeColor(style.backgroundColor);
  const fontFamily = safeFontFamily(style.fontFamily);
  if (color) {
    result.color = color;
    customProperties["--presentation-text-color"] = color;
  }
  if (backgroundColor) result.backgroundColor = backgroundColor;
  if (fontFamily) result.fontFamily = fontFamily;
  if (Number.isFinite(style.fontSize)) {
    const fontSize = `${Math.max(12, Math.min(48, Number(style.fontSize)))}px`;
    result.fontSize = fontSize;
    customProperties["--presentation-font-size"] = fontSize;
  }
  if ([400, 500, 600, 700].includes(Number(style.fontWeight))) result.fontWeight = Number(style.fontWeight);
  if (style.textAlign && ["left", "center", "right"].includes(style.textAlign)) result.textAlign = style.textAlign;
  if (Number.isFinite(style.borderRadius)) result.borderRadius = `${Math.max(0, Math.min(32, Number(style.borderRadius)))}px`;
  if (Number.isFinite(style.padding)) result.padding = `${Math.max(0, Math.min(48, Number(style.padding)))}px`;

  const widths = { narrow: "min(100%, 42rem)", medium: "min(100%, 56rem)", wide: "min(100%, 72rem)", full: "100%" };
  if (layout.width && layout.width !== "auto") result.width = widths[layout.width];
  if (layout.align === "center") result.marginInline = "auto";
  else if (layout.align === "end") result.marginInlineStart = "auto";
  else if (layout.align === "start") result.marginInlineEnd = "auto";
  else if (layout.align === "stretch") result.width = "100%";
  if (Number.isFinite(layout.spacingBefore)) result.marginBlockStart = `${Math.max(0, Math.min(96, Number(layout.spacingBefore)))}px`;
  if (Number.isFinite(layout.spacingAfter)) result.marginBlockEnd = `${Math.max(0, Math.min(96, Number(layout.spacingAfter)))}px`;
  return Object.assign(result, customProperties) as CSSProperties;
}

export function getLessonPresentationStyle(presentation?: LessonPresentation): CSSProperties {
  if (!presentation) return {};
  const result: CSSProperties = {};
  const customProperties: Record<string, string> = {};
  const backgroundColor = safeColor(presentation.backgroundColor);
  const color = safeColor(presentation.textColor);
  const fontFamily = safeFontFamily(presentation.fontFamily);
  if (backgroundColor) result.backgroundColor = backgroundColor;
  if (color) {
    result.color = color;
    customProperties["--presentation-text-color"] = color;
  }
  if (fontFamily) result.fontFamily = fontFamily;
  if (Number.isFinite(presentation.fontSize)) {
    const fontSize = `${Math.max(12, Math.min(24, Number(presentation.fontSize)))}px`;
    result.fontSize = fontSize;
    customProperties["--presentation-font-size"] = fontSize;
  }
  if (presentation.textAlign && ["left", "center", "right"].includes(presentation.textAlign)) result.textAlign = presentation.textAlign;
  if (Number.isFinite(presentation.padding)) result.padding = `${Math.max(12, Math.min(64, Number(presentation.padding)))}px`;
  const widths = { narrow: "46rem", medium: "62rem", wide: "76rem" };
  if (presentation.contentWidth) result.maxWidth = widths[presentation.contentWidth];
  return Object.assign(result, customProperties) as CSSProperties;
}
