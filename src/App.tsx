import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eraser,
  Eye,
  EyeOff,
  Image,
  MousePointer2,
  Paintbrush,
  Plus,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  Pipette,
} from "lucide-react";
import ColorTriangle from "./ColorTriangle";

type CanvasSettings = {
  name: string;
  width: number;
  height: number;
  background: string;
  showGrid: boolean;
};

type CanvasCategory = "standard" | "pixel-art";
type ActiveTool = "brush" | "eyedropper" | "eraser" | "select";
type ColorPickerMode = "triangle" | "rgb" | "palette";
type Layer = { id: string; name: string; visible: boolean; opacity: number };
type PixelColor = [number, number, number, number];
type PixelChange = { x: number; y: number; before: PixelColor; after?: PixelColor };
type HistoryAction =
  | { type: "stroke"; layerId: string; pixels: PixelChange[] }
  | { type: "clear"; layerId: string; before: string }
  | { type: "layers"; before: Layer[]; after: Layer[]; activeBefore: string; activeAfter: string };

const pixelArtPresets = [
  { label: "Ícone", width: 32, height: 32 },
  { label: "Sprite", width: 64, height: 64 },
  { label: "Paisagem", width: 160, height: 90 },
  { label: "Quadrado", width: 128, height: 128 },
];

const standardPresets = [
  { label: "Full HD", width: 1920, height: 1080 },
  { label: "HD", width: 1280, height: 720 },
  { label: "Quadrado", width: 1080, height: 1080 },
  { label: "Retrato", width: 1080, height: 1350 },
];

const swatches = ["#f3f4f6", "#15171c", "#e76f51", "#e9c46a", "#78a882", "#6c8ee8"];
const paletteColors = [
  "#000000", "#222034", "#45283c", "#663931", "#8f563b", "#df7126", "#d9a066", "#eec39a",
  "#fbf236", "#99e550", "#6abe30", "#37946e", "#4b692f", "#524b24", "#323c39", "#3f3f74",
  "#306082", "#5b6ee1", "#639bff", "#5fcde4", "#cbdbfc", "#ffffff", "#9badb7", "#847e87",
  "#696a6a", "#595652", "#76428a", "#ac3232", "#d95763", "#d77bba", "#8f974a", "#8a6f30",
  "#ffcccc", "#ff9999", "#ff6666", "#ff3333", "#cc0000", "#990000", "#660000", "#330000",
  "#ccffff", "#99ffff", "#66ffff", "#33ffff", "#00cccc", "#009999", "#006666", "#003333",
];

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const layerCanvasRefs = useRef(new Map<string, HTMLCanvasElement>());
  const initialLayerColors = useRef(new Map<string, string>());
  const history = useRef<HistoryAction[]>([]);
  const redoHistory = useRef<HistoryAction[]>([]);
  const strokePixels = useRef(new Map<string, PixelChange>());
  const strokeLayerId = useRef("");
  const layerControlStart = useRef<Layer[] | null>(null);
  const layerNameStart = useRef<Layer[] | null>(null);
  const [settings, setSettings] = useState<CanvasSettings>({
    name: "Minha imagem",
    width: 1920,
    height: 1080,
    background: "#ffffff",
    showGrid: false,
  });
  const [category, setCategory] = useState<CanvasCategory>("standard");
  const [created, setCreated] = useState(false);
  const [creationOpen, setCreationOpen] = useState(true);
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedTool, setSelectedTool] = useState<ActiveTool>("brush");
  const [altEyedropper, setAltEyedropper] = useState(false);
  const activeTool = altEyedropper ? "eyedropper" : selectedTool;
  const [color, setColor] = useState("#15171c");
  const [hexInput, setHexInput] = useState("#15171C");
  const [colorPickerMode, setColorPickerMode] = useState<ColorPickerMode>("triangle");
  const [hue, setHue] = useState(0);
  const [eraserMode, setEraserMode] = useState<"transparent" | "background">("transparent");
  const [eraserColor, setEraserColor] = useState("#ffffff");
  const [layers, setLayers] = useState<Layer[]>([]);
  const layersRef = useRef<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState("");
  const [historyVersion, setHistoryVersion] = useState(0);
  const [zoom, setZoom] = useState(8);
  const canvasHeight = settings.height * zoom;
  const [drawing, setDrawing] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [toolCursor, setToolCursor] = useState({ visible: false, x: 0, y: 0 });
  const presets = category === "pixel-art" ? pixelArtPresets : standardPresets;
  useEffect(() => setHexInput(color.toUpperCase()), [color]);
  const maxZoomForArea = (currentZoom: number) => {
    const canvasArea = canvasAreaRef.current;
    const canvas = canvasRef.current;
    if (!canvasArea || !canvas) return currentZoom;

    const currentPixelSize = canvas.getBoundingClientRect().height / settings.height;
    return currentZoom * (canvasArea.clientHeight / (currentPixelSize * 10));
  };
  const fitCanvasZoom = () => {
    const area = canvasAreaRef.current;
    if (!area) return 1;
    return Math.max(
      0.1,
      Math.min((area.clientWidth - 56) / settings.width, (area.clientHeight - 80) / settings.height),
    );
  };
  const adjustZoom = (amount: number) => {
    setZoom((current) => {
      const nextZoom = Math.max(0.1, current + amount);
      return amount > 0 ? Math.min(nextZoom, maxZoomForArea(current)) : nextZoom;
    });
  };
  const centerCanvas = () => {
    setZoom(fitCanvasZoom());
    requestAnimationFrame(() => {
      const area = canvasAreaRef.current;
      if (!area) return;
      area.scrollLeft = (area.scrollWidth - area.clientWidth) / 2;
      area.scrollTop = (area.scrollHeight - area.clientHeight) / 2;
    });
  };
  useEffect(() => {
    if (!created) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = settings.width;
    canvas.height = settings.height;
    setZoom(fitCanvasZoom());
  }, [created, canvasRevision]);

  useEffect(() => {
    const canvasArea = canvasAreaRef.current;
    if (!canvasArea || !created) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
      setZoom((current) => {
        const nextZoom = Math.max(0.1, current * factor);
        return event.deltaY < 0 ? Math.min(nextZoom, maxZoomForArea(current)) : nextZoom;
      });
    };

    canvasArea.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvasArea.removeEventListener("wheel", handleWheel);
  }, [created, settings.height, zoom]);

  const changeSetting = <Key extends keyof CanvasSettings>(
    key: Key,
    value: CanvasSettings[Key],
  ) => setSettings((current) => ({ ...current, [key]: value }));

  const setLayerStack = (nextLayers: Layer[]) => {
    layersRef.current = nextLayers;
    setLayers(nextLayers);
  };

  const recordHistory = (action: HistoryAction) => {
    history.current.push(action);
    if (history.current.length > 50) history.current.shift();
    redoHistory.current = [];
    setHistoryVersion((version) => version + 1);
  };

  const recordLayerChange = (before: Layer[], after: Layer[], activeBefore = activeLayerId, activeAfter = activeLayerId) => {
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    recordHistory({ type: "layers", before, after, activeBefore, activeAfter });
  };

  const paintPixel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!created || !["brush", "eraser"].includes(activeTool)) return;
    const layerId = strokeLayerId.current || activeLayerId;
    const canvas = layerCanvasRefs.current.get(layerId);
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const bounds = canvas.getBoundingClientRect();
    const x = Math.min(settings.width - 1, Math.max(0, Math.floor(((event.clientX - bounds.left) / bounds.width) * settings.width)));
    const y = Math.min(settings.height - 1, Math.max(0, Math.floor(((event.clientY - bounds.top) / bounds.height) * settings.height)));
    const key = `${x},${y}`;
    if (!strokePixels.current.has(key)) {
      const pixel = context.getImageData(x, y, 1, 1).data;
      strokePixels.current.set(key, { x, y, before: [pixel[0], pixel[1], pixel[2], pixel[3]] });
    }

    if (activeTool === "eraser" && eraserMode === "transparent") {
      context.clearRect(x, y, 1, 1);
    } else {
      context.fillStyle = activeTool === "eraser" ? eraserColor : color;
      context.fillRect(x, y, 1, 1);
    }
  };

  const drawPixel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawing) paintPixel(event);
  };

  const finishStroke = () => {
    if (strokePixels.current.size > 0) {
      const canvas = layerCanvasRefs.current.get(strokeLayerId.current);
      const context = canvas?.getContext("2d");
      if (context) {
        strokePixels.current.forEach((pixel) => {
          const current = context.getImageData(pixel.x, pixel.y, 1, 1).data;
          pixel.after = [current[0], current[1], current[2], current[3]];
        });
      }
      recordHistory({
        type: "stroke",
        layerId: strokeLayerId.current,
        pixels: Array.from(strokePixels.current.values()),
      });
    }
    strokePixels.current.clear();
    strokeLayerId.current = "";
    setDrawing(false);
  };

  const getCompositeCanvas = () => {
    const composite = document.createElement("canvas");
    composite.width = settings.width;
    composite.height = settings.height;
    const context = composite.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Não foi possível compor as camadas.");

    layersRef.current.forEach((layer) => {
      if (!layer.visible) return;
      const layerCanvas = layerCanvasRefs.current.get(layer.id);
      if (!layerCanvas) throw new Error(`A camada "${layer.name}" não está disponível.`);
      context.globalAlpha = layer.opacity / 100;
      context.drawImage(layerCanvas, 0, 0);
    });
    context.globalAlpha = 1;
    return composite;
  };

  const sampleColor = (event: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = Math.min(settings.width - 1, Math.max(0, Math.floor(((event.clientX - bounds.left) / bounds.width) * settings.width)));
      const y = Math.min(settings.height - 1, Math.max(0, Math.floor(((event.clientY - bounds.top) / bounds.height) * settings.height)));
      const context = getCompositeCanvas().getContext("2d");
      if (!context) throw new Error("Não foi possível ler a cor do canvas.");
      const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
      if (alpha === 0) return;
      const sampled = `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
      setColor(sampled);
    } catch (error) {
      console.error("Não foi possível capturar a cor.", error);
      setStatusMessage("Não foi possível capturar a cor do pixel.");
    }
  };

  const panCanvasArea = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!spaceHeld) return;

    const canvasArea = canvasAreaRef.current;
    if (!canvasArea) return;

    canvasArea.scrollLeft -= event.movementX;
    canvasArea.scrollTop -= event.movementY;
  };

  const createCanvas = () => {
    const baseLayer: Layer = { id: crypto.randomUUID(), name: "Plano de fundo", visible: true, opacity: 100 };
    layerCanvasRefs.current.clear();
    initialLayerColors.current.clear();
    initialLayerColors.current.set(baseLayer.id, settings.background);
    history.current = [];
    redoHistory.current = [];
    setLayerStack([baseLayer]);
    setActiveLayerId(baseLayer.id);
    setEraserColor(settings.background);
    setHistoryVersion((version) => version + 1);
    setCreated(true);
    setCanvasRevision((revision) => revision + 1);
    setCreationOpen(false);
    setStatusMessage("");
  };

  const startNewCanvas = () => {
    if (created && !window.confirm("Criar um novo canvas? O canvas atual será descartado quando o novo for criado.")) {
      return;
    }

    setCreationOpen(true);
    setStatusMessage("");
  };

  const saveImage = async () => {
    if (!created) return;

    try {
      const result = await window.pixelStudio.saveImage(getCompositeCanvas().toDataURL("image/png"), settings.name);
      setStatusMessage(result.saved ? "Imagem salva em PNG." : "");
    } catch (error) {
      console.error("Não foi possível salvar a imagem.", error);
      setStatusMessage("Não foi possível salvar a imagem. Tente novamente.");
    }
  };

  useEffect(() => {
    if (!window.pixelStudio) return;
    return window.pixelStudio.onMenuAction((action) => {
      if (action === "new-canvas") startNewCanvas();
      if (action === "save-image") void saveImage();
    });
  }, [created, settings.name]);

  const clearCanvas = () => {
    const canvas = layerCanvasRefs.current.get(activeLayerId);
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const before = canvas.toDataURL("image/png");
    context.clearRect(0, 0, settings.width, settings.height);
    recordHistory({ type: "clear", layerId: activeLayerId, before });
  };

  const undo = async () => {
    const action = history.current[history.current.length - 1];
    if (!action) return;
    let restoredImage: HTMLImageElement | undefined;
    if (action.type === "clear") {
      try {
        const image = document.createElement("img");
        image.src = action.before;
        await image.decode();
        restoredImage = image;
      } catch (error) {
        console.error("Não foi possível restaurar a camada.", error);
        setStatusMessage("Não foi possível desfazer a limpeza da camada.");
        return;
      }
    }
    history.current.pop();
    if (action.type === "layers") {
      setLayerStack(action.before);
      setActiveLayerId(action.activeBefore);
    } else {
      const context = layerCanvasRefs.current.get(action.layerId)?.getContext("2d");
      if (!context) return;
      if (action.type === "clear") {
        if (restoredImage) context.drawImage(restoredImage, 0, 0);
      } else {
        action.pixels.forEach(({ x, y, before }) => {
          const pixel = context.createImageData(1, 1);
          pixel.data.set(before);
          context.putImageData(pixel, x, y);
        });
      }
    }
    redoHistory.current.push(action);
    setHistoryVersion((version) => version + 1);
  };

  const redo = () => {
    const action = redoHistory.current.pop();
    if (!action) return;
    if (action.type === "layers") {
      setLayerStack(action.after);
      setActiveLayerId(action.activeAfter);
    } else {
      const context = layerCanvasRefs.current.get(action.layerId)?.getContext("2d");
      if (!context) return;
      if (action.type === "clear") context.clearRect(0, 0, settings.width, settings.height);
      if (action.type === "stroke") {
        const canvas = layerCanvasRefs.current.get(action.layerId);
        const layerContext = canvas?.getContext("2d");
        if (layerContext) {
          action.pixels.forEach((pixel) => {
            if (pixel.after) {
              const image = layerContext.createImageData(1, 1);
              image.data.set(pixel.after);
              layerContext.putImageData(image, pixel.x, pixel.y);
            }
          });
        }
      }
    }
    history.current.push(action);
    setHistoryVersion((version) => version + 1);
  };

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Alt" && !isEditableTarget(event.target) && selectedTool === "brush") {
        event.preventDefault();
        setAltEyedropper(true);
        return;
      }
      if (isEditableTarget(event.target)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else void undo();
      } else if (event.code === "Space") {
        event.preventDefault();
        setSpaceHeld(true);
      } else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        const tools: Record<string, ActiveTool> = { b: "brush", e: "eraser", j: "eyedropper" };
        const tool = tools[event.key.toLowerCase()];
        if (tool) {
          event.preventDefault();
          setSelectedTool(tool);
        }
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpaceHeld(false);
      if (event.key === "Alt") setAltEyedropper(false);
    };
    const handleWindowBlur = () => {
      setSpaceHeld(false);
      setAltEyedropper(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [redo, selectedTool, undo]);

  const commitLayerStack = (next: Layer[], nextActiveLayerId = activeLayerId) => {
    const before = layersRef.current;
    setLayerStack(next);
    recordLayerChange(before, next, activeLayerId, nextActiveLayerId);
    if (nextActiveLayerId !== activeLayerId) setActiveLayerId(nextActiveLayerId);
  };

  const addLayer = () => {
    const layer = { id: crypto.randomUUID(), name: `Camada ${layersRef.current.length}`, visible: true, opacity: 100 };
    commitLayerStack([...layersRef.current, layer]);
    setActiveLayerId(layer.id);
  };

  const deleteLayer = (id: string) => {
    if (layersRef.current.length <= 1) return;
    const before = layersRef.current;
    const index = before.findIndex((layer) => layer.id === id);
    const next = before.filter((layer) => layer.id !== id);
    const nextActiveLayerId = activeLayerId === id ? next[Math.max(0, index - 1)].id : activeLayerId;
    commitLayerStack(next, nextActiveLayerId);
  };

  const moveLayer = (id: string, direction: -1 | 1) => {
    const before = layersRef.current;
    const index = before.findIndex((layer) => layer.id === id);
    const target = index + direction;
    if (target < 0 || target >= before.length) return;
    const next = [...before];
    [next[index], next[target]] = [next[target], next[index]];
    commitLayerStack(next);
  };

  const selectPreset = (width: number, height: number) => {
    changeSetting("width", width);
    changeSetting("height", height);
  };

  const canvasScale = zoom;
  const canvasWidth = settings.width * canvasScale;
  const toolHint = activeTool === "brush"
    ? "Pincel ativo · clique e arraste para desenhar"
    : activeTool === "eraser"
      ? "Borracha ativa · clique e arraste para apagar"
      : activeTool === "eyedropper"
        ? "Conta-gotas ativo · clique em um pixel para capturar a cor"
        : "Ferramenta de seleção ativa";

  return (
    <main className="app-shell">
      <div className="workspace">
        <aside className="tool-rail" aria-label="Ferramentas">
          <div className="rail-group">
            <button
              className={`tool-button ${activeTool === "brush" ? "selected" : ""}`}
              onClick={() => { setAltEyedropper(false); setSelectedTool("brush"); }}
              title="Pincel (B)"
              aria-label="Pincel"
            ><Paintbrush size={18} /></button>
            <button
              className={`tool-button ${activeTool === "select" ? "selected" : ""}`}
              onClick={() => { setAltEyedropper(false); setSelectedTool("select"); }}
              title="Selecionar (V)"
              aria-label="Selecionar"
            ><MousePointer2 size={18} /></button>
            <button
              className={`tool-button ${activeTool === "eyedropper" ? "selected" : ""}`}
              onClick={() => { setAltEyedropper(false); setSelectedTool("eyedropper"); }}
              title="Conta-gotas (J)"
              aria-label="Conta-gotas"
            ><Pipette size={17} /></button>
            <button
              className={`tool-button ${activeTool === "eraser" ? "selected" : ""}`}
              onClick={() => { setAltEyedropper(false); setSelectedTool("eraser"); }}
              title="Borracha (E)"
              aria-label="Borracha"
            ><Eraser size={17} /></button>
          </div>
          <div className="rail-separator" />
          <button className="tool-button" title="Limpar canvas" aria-label="Limpar canvas" onClick={clearCanvas}><Trash2 size={17} /></button>
          <div className="rail-bottom">
            <label className="current-color" style={{ backgroundColor: color }} title={`Cor do pincel: ${color}`}>
              <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Escolher cor do pincel" />
            </label>
          </div>
        </aside>

        <section className="editor">
          <div className="editor-toolbar" data-history-version={historyVersion}>
            <div className="toolbar-right">
              <button className="icon-button subtle" onClick={() => adjustZoom(zoom < 1 ? -0.1 : -1)} aria-label="Diminuir zoom"><ZoomOut size={15} /></button>
              <button className="zoom-label" onClick={centerCanvas} title="Centralizar e ajustar canvas à tela">{Math.round(zoom * 100)}%</button>
              <button className="icon-button subtle" onClick={() => adjustZoom(zoom < 1 ? 0.1 : 1)} aria-label="Aumentar zoom"><ZoomIn size={15} /></button>
            </div>
          </div>

          <div
            ref={canvasAreaRef}
            className={`canvas-area ${created ? "has-canvas" : ""}${spaceHeld ? " space-pan" : ""}`}
            onPointerEnter={(event) => {
              setToolCursor({ visible: true, x: event.clientX, y: event.clientY });
            }}
            onPointerMove={(event) => {
              setToolCursor({ visible: true, x: event.clientX, y: event.clientY });
              panCanvasArea(event);
            }}
            onPointerLeave={() => setToolCursor((cursor) => ({ ...cursor, visible: false }))}
          >
            {created ? (
              <div className="canvas-stage">
                <div
                  className={`canvas-surface ${settings.showGrid && settings.width <= 128 && settings.height <= 128 ? "pixel-grid" : ""}`}
                  style={{
                    width: canvasWidth,
                    height: canvasHeight,
                    backgroundColor: settings.background,
                    backgroundSize: `${zoom}px ${zoom}px`,
                  }}
                >
                  {layers.map((layer) => (
                    <canvas
                      key={layer.id}
                      ref={(element) => {
                        if (!element) return;
                        const previousCanvas = layerCanvasRefs.current.get(layer.id);
                        if (previousCanvas && previousCanvas !== element) {
                          element.width = settings.width;
                          element.height = settings.height;
                          const context = element.getContext("2d", { willReadFrequently: true });
                          if (!context) throw new Error("Não foi possível restaurar a camada.");
                          context.drawImage(previousCanvas, 0, 0);
                        }
                        layerCanvasRefs.current.set(layer.id, element);
                        if (element.width !== settings.width || element.height !== settings.height || initialLayerColors.current.has(layer.id)) {
                          element.width = settings.width;
                          element.height = settings.height;
                          const fill = initialLayerColors.current.get(layer.id);
                          if (fill) {
                            const context = element.getContext("2d", { willReadFrequently: true });
                            if (!context) throw new Error("Não foi possível inicializar a camada.");
                            context.fillStyle = fill;
                            context.fillRect(0, 0, settings.width, settings.height);
                            initialLayerColors.current.delete(layer.id);
                          }
                        }
                      }}
                      className="layer-canvas"
                      style={{ opacity: layer.visible ? layer.opacity / 100 : 0 }}
                      aria-hidden="true"
                    />
                  ))}
                  <canvas
                    ref={canvasRef}
                    className={`art-canvas tool-${activeTool}`}
                    aria-label={`${settings.name}, ${settings.width} por ${settings.height} pixels`}
                    onPointerDown={(event) => {
                      if (spaceHeld) return;
                      if (activeTool === "eyedropper") {
                        sampleColor(event);
                        return;
                      }
                      if (activeTool === "select") return;
                      strokePixels.current.clear();
                      strokeLayerId.current = activeLayerId;
                      setDrawing(true);
                      event.currentTarget.setPointerCapture(event.pointerId);
                      paintPixel(event);
                    }}
                    onPointerMove={drawPixel}
                    onPointerUp={finishStroke}
                    onPointerCancel={finishStroke}
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
                <div className="canvas-caption">
                  <span>{settings.name}</span>
                  <span>{settings.width} × {settings.height} px</span>
                </div>
              </div>
            ) : (
              <div className="empty-workspace">
                <Image size={22} />
                <span>Crie um canvas para começar</span>
              </div>
            )}
            {toolCursor.visible && !spaceHeld && (
              <span
                className="floating-tool-cursor"
                style={{
                  left: Math.min(toolCursor.x + 14, window.innerWidth - 32),
                  top: Math.max(0, toolCursor.y - 22),
                }}
                aria-hidden="true"
              >
                {activeTool === "brush" && <Paintbrush size={16} />}
                {activeTool === "eraser" && <Eraser size={16} />}
                {activeTool === "eyedropper" && <Pipette size={16} />}
                {activeTool === "select" && <MousePointer2 size={16} />}
              </span>
            )}
          </div>

          <footer className="statusbar">
            <span className="status-hint">{statusMessage || (created ? toolHint : "Pronto para criar")}</span>
            <span>{created ? `${settings.width} × ${settings.height} px` : "Desenhe e edite imagens com simplicidade."}</span>
          </footer>
        </section>

        <aside className="properties-panel" aria-label="Cor e camadas">
          <section className="properties-section color-section">
            <div className="properties-heading">
              <div>
                <span className="panel-kicker">FERRAMENTAS</span>
                <h2>Cor do pincel</h2>
              </div>
              <label className="current-color-panel" style={{ backgroundColor: color }} title={`Cor atual: ${color}`}>
                <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Escolher cor do pincel" />
              </label>
            </div>
            <div className="color-picker-tabs" role="tablist" aria-label="Modo de seleção de cor">
              <button className={colorPickerMode === "triangle" ? "active" : ""} role="tab" aria-selected={colorPickerMode === "triangle"} onClick={() => setColorPickerMode("triangle")}>Triângulo</button>
              <button className={colorPickerMode === "rgb" ? "active" : ""} role="tab" aria-selected={colorPickerMode === "rgb"} onClick={() => setColorPickerMode("rgb")}>RGB</button>
              <button className={colorPickerMode === "palette" ? "active" : ""} role="tab" aria-selected={colorPickerMode === "palette"} onClick={() => setColorPickerMode("palette")}>Paleta</button>
            </div>
            {colorPickerMode === "triangle" && (
              <>
                <ColorTriangle color={color} hue={hue} onColorChange={setColor} onHueChange={setHue} />
                <div className="swatch-row">
                  {swatches.map((swatch) => (
                    <button key={swatch} className={`color-swatch ${color === swatch ? "active" : ""}`} style={{ backgroundColor: swatch }} onClick={() => setColor(swatch)} aria-label={`Selecionar cor ${swatch}`} />
                  ))}
                </div>
              </>
            )}
            {colorPickerMode === "rgb" && (
              <div className="rgb-picker">
                {[
                  { label: "R", index: 1, value: parseInt(color.slice(1, 3), 16) },
                  { label: "G", index: 2, value: parseInt(color.slice(3, 5), 16) },
                  { label: "B", index: 3, value: parseInt(color.slice(5, 7), 16) },
                ].map((channel) => (
                  <label className={`rgb-channel rgb-${channel.label.toLowerCase()}`} key={channel.label}>
                    <span>{channel.label}</span>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={channel.value}
                      aria-label={`Canal ${channel.label}`}
                      onChange={(event) => {
                        const channels = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16));
                        channels[channel.index - 1] = Number(event.target.value);
                        setColor(`#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`);
                      }}
                    />
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={channel.value}
                      aria-label={`Valor ${channel.label}`}
                      onChange={(event) => {
                        const channels = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16));
                        channels[channel.index - 1] = Math.max(0, Math.min(255, Number(event.target.value) || 0));
                        setColor(`#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`);
                      }}
                    />
                  </label>
                ))}
                <label className="hex-color-input">
                  <span>HEX</span>
                  <input
                    value={hexInput}
                    aria-label="Código hexadecimal da cor"
                    maxLength={7}
                    onChange={(event) => {
                      const input = event.target.value;
                      setHexInput(input);
                      const value = input.startsWith("#") ? input : `#${input}`;
                      if (/^#[0-9a-fA-F]{6}$/.test(value)) setColor(value.toLowerCase());
                    }}
                    onBlur={() => {
                      if (!/^#[0-9a-fA-F]{6}$/.test(hexInput)) setHexInput(color.toUpperCase());
                    }}
                  />
                </label>
              </div>
            )}
            {colorPickerMode === "palette" && (
              <div className="color-palette" aria-label="Paleta de cores">
                {paletteColors.map((swatch) => (
                  <button
                    key={swatch}
                    className={`palette-color ${color === swatch ? "active" : ""}`}
                    style={{ backgroundColor: swatch }}
                    onClick={() => setColor(swatch)}
                    title={swatch.toUpperCase()}
                    aria-label={`Selecionar cor ${swatch}`}
                  />
                ))}
              </div>
            )}
            {activeTool === "eraser" && (
              <div className="eraser-options">
                <span className="field-label">Modo da borracha</span>
                <div className="eraser-mode-buttons">
                  <button className={eraserMode === "transparent" ? "active" : ""} onClick={() => setEraserMode("transparent")}>Transparente</button>
                  <button className={eraserMode === "background" ? "active" : ""} onClick={() => setEraserMode("background")}>Cor fixa</button>
                </div>
                {eraserMode === "background" && (
                  <label className="eraser-color-row">
                    <input type="color" value={eraserColor} onChange={(event) => setEraserColor(event.target.value)} aria-label="Cor fixa da borracha" />
                    <span>Cor fixa</span>
                    <button onClick={() => setEraserColor(settings.background)}>Usar fundo</button>
                  </label>
                )}
              </div>
            )}
          </section>
          <section className="properties-section layers-section">
            <div className="properties-heading layers-heading">
              <div>
                <span className="panel-kicker">DOCUMENTO</span>
                <h2>Camadas <span>{layers.length}</span></h2>
              </div>
              <button className="icon-button subtle" onClick={addLayer} disabled={!created} title="Adicionar camada" aria-label="Adicionar camada"><Plus size={16} /></button>
            </div>
            {!created ? (
              <p className="layers-empty">Crie um canvas para começar a usar camadas.</p>
            ) : (
              <div className="layer-list">
                {[...layers].reverse().map((layer) => {
                  const index = layers.findIndex((item) => item.id === layer.id);
                  return (
                    <div className={`layer-item ${activeLayerId === layer.id ? "active" : ""}`} key={layer.id} onClick={() => setActiveLayerId(layer.id)}>
                      <button
                        className="layer-visibility"
                        aria-label={layer.visible ? "Ocultar camada" : "Mostrar camada"}
                        title={layer.visible ? "Ocultar camada" : "Mostrar camada"}
                        onClick={(event) => {
                          event.stopPropagation();
                          const next = layers.map((item) => item.id === layer.id ? { ...item, visible: !item.visible } : item);
                          commitLayerStack(next);
                        }}
                      >{layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                      <div className="layer-info">
                        <input
                          className="layer-name"
                          aria-label="Nome da camada"
                          value={layer.name}
                          onClick={(event) => event.stopPropagation()}
                          onFocus={() => { layerNameStart.current = layersRef.current; }}
                          onChange={(event) => {
                            const next = layers.map((item) => item.id === layer.id ? { ...item, name: event.target.value } : item);
                            setLayerStack(next);
                          }}
                          onBlur={() => {
                            if (layerNameStart.current) recordLayerChange(layerNameStart.current, layersRef.current);
                            layerNameStart.current = null;
                          }}
                        />
                        <label className="layer-opacity" onClick={(event) => event.stopPropagation()}>
                          <span>Opacidade</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={layer.opacity}
                            aria-label={`Opacidade de ${layer.name}`}
                            onPointerDown={() => { layerControlStart.current = layersRef.current; }}
                            onChange={(event) => setLayerStack(layersRef.current.map((item) => item.id === layer.id ? { ...item, opacity: Number(event.target.value) } : item))}
                            onPointerUp={() => {
                              if (layerControlStart.current) recordLayerChange(layerControlStart.current, layersRef.current);
                              layerControlStart.current = null;
                            }}
                            onBlur={() => {
                              if (layerControlStart.current) recordLayerChange(layerControlStart.current, layersRef.current);
                              layerControlStart.current = null;
                            }}
                          />
                          <span>{layer.opacity}%</span>
                        </label>
                      </div>
                      <div className="layer-actions">
                        <button aria-label="Mover camada para cima" title="Mover para cima" disabled={index === layers.length - 1} onClick={(event) => { event.stopPropagation(); moveLayer(layer.id, 1); }}><ChevronUp size={13} /></button>
                        <button aria-label="Mover camada para baixo" title="Mover para baixo" disabled={index === 0} onClick={(event) => { event.stopPropagation(); moveLayer(layer.id, -1); }}><ChevronDown size={13} /></button>
                        <button aria-label="Excluir camada" title="Excluir camada" disabled={layers.length <= 1} onClick={(event) => { event.stopPropagation(); deleteLayer(layer.id); }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </div>

      {creationOpen && (
        <div className="creation-backdrop">
          <section className="creation-dialog" role="dialog" aria-modal="true" aria-labelledby="creation-title">
            <header className="creation-dialog-header">
              <div className="creation-title-group">
                <div className="creation-icon"><Image size={18} /></div>
                <div>
                  <div className="panel-kicker">NOVO PROJETO</div>
                  <h2 id="creation-title">Criar canvas</h2>
                </div>
              </div>
              {created && (
                <button className="icon-button subtle" aria-label="Fechar" onClick={() => setCreationOpen(false)}><X size={17} /></button>
              )}
            </header>
            <p className="creation-description">Escolha o tipo e as dimensões da sua área de trabalho.</p>

            <div className="category-tabs" role="tablist" aria-label="Categoria do canvas">
              <button
                className={`category-tab ${category === "standard" ? "active" : ""}`}
                role="tab"
                aria-selected={category === "standard"}
                onClick={() => {
                  setCategory("standard");
                  setSettings((current) => ({ ...current, width: 1920, height: 1080, showGrid: false }));
                }}
              >Padrão</button>
              <button
                className={`category-tab ${category === "pixel-art" ? "active" : ""}`}
                role="tab"
                aria-selected={category === "pixel-art"}
                onClick={() => {
                  setCategory("pixel-art");
                  setSettings((current) => ({ ...current, width: 32, height: 32, showGrid: true }));
                }}
              >Pixel art</button>
            </div>

            <div className="dialog-fields">
              <div className="panel-section">
                <label className="field-label" htmlFor="canvas-name">Nome do arquivo</label>
                <input id="canvas-name" className="text-input" value={settings.name} onChange={(event) => changeSetting("name", event.target.value)} />
              </div>

              <div className="panel-section">
                <div className="section-title-row">
                  <span className="field-label">Tamanho do canvas</span>
                  <span className="unit-label">px</span>
                </div>
                <div className="dimensions">
                  <label className="dimension-field">
                    <span>LARGURA</span>
                    <input type="number" min="1" max="4096" value={settings.width} onChange={(event) => changeSetting("width", Math.min(4096, Math.max(1, Number(event.target.value))))} />
                  </label>
                  <span className="dimension-x">×</span>
                  <label className="dimension-field">
                    <span>ALTURA</span>
                    <input type="number" min="1" max="4096" value={settings.height} onChange={(event) => changeSetting("height", Math.min(4096, Math.max(1, Number(event.target.value))))} />
                  </label>
                </div>
                <div className="presets">
                  {presets.map((preset) => (
                    <button
                      key={preset.label}
                      className={`preset-chip ${settings.width === preset.width && settings.height === preset.height ? "active" : ""}`}
                      onClick={() => selectPreset(preset.width, preset.height)}
                    >{preset.label}</button>
                  ))}
                </div>
              </div>

              <div className="dialog-options-row">
                <div className="dialog-background">
                  <div className="section-title-row">
                    <span className="field-label">Cor de fundo</span>
                    <span className="color-value">{settings.background.toUpperCase()}</span>
                  </div>
                  <div className="color-options">
                    {swatches.map((swatch) => (
                      <button key={swatch} className={`color-swatch ${settings.background === swatch ? "active" : ""}`} style={{ backgroundColor: swatch }} onClick={() => changeSetting("background", swatch)} aria-label={`Fundo ${swatch}`} />
                    ))}
                    <label className="custom-color" title="Escolher outra cor">
                      <Plus size={15} />
                      <input type="color" value={settings.background} onChange={(event) => changeSetting("background", event.target.value)} aria-label="Escolher cor de fundo" />
                    </label>
                  </div>
                </div>
                <div className="dialog-grid-option">
                  <div>
                    <span className="option-title">Grade de pixels</span>
                    <span className="option-caption">Sobrepor grade</span>
                  </div>
                  <button className={`toggle ${settings.showGrid ? "on" : ""}`} role="switch" aria-checked={settings.showGrid} aria-label="Grade de pixels" onClick={() => changeSetting("showGrid", !settings.showGrid)}><span /></button>
                </div>
              </div>
            </div>

            <div className="dialog-footer">
              <div className="resolution-note"><Check size={14} /> {(settings.width * settings.height).toLocaleString("pt-BR")} pixels</div>
              <div className="dialog-actions">
                {created && <button className="secondary-button" onClick={() => setCreationOpen(false)}>Cancelar</button>}
                <button className="primary-button create-button" onClick={createCanvas}><Plus size={16} /> Criar canvas <span>↵</span></button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
