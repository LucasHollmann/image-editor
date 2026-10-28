import { useEffect, useRef, useState } from "react";
import {
  Check,
  CircleHelp,
  FilePlus2,
  Grid2X2,
  Image,
  MoreHorizontal,
  MousePointer2,
  Paintbrush,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type CanvasSettings = {
  name: string;
  width: number;
  height: number;
  background: string;
  showGrid: boolean;
};

type CanvasCategory = "standard" | "pixel-art";

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

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
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
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeTool, setActiveTool] = useState<"brush" | "select">("brush");
  const [color, setColor] = useState("#15171c");
  const [zoom, setZoom] = useState(8);
  const canvasHeight = settings.height * zoom;
  const [drawing, setDrawing] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const presets = category === "pixel-art" ? pixelArtPresets : standardPresets;
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
  useEffect(() => {
    if (!created) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    canvas.width = settings.width;
    canvas.height = settings.height;
    context.fillStyle = settings.background;
    context.fillRect(0, 0, settings.width, settings.height);
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

  const paintPixel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!created || activeTool !== "brush") return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const bounds = canvas.getBoundingClientRect();
    const x = Math.min(settings.width - 1, Math.max(0, Math.floor(((event.clientX - bounds.left) / bounds.width) * settings.width)));
    const y = Math.min(settings.height - 1, Math.max(0, Math.floor(((event.clientY - bounds.top) / bounds.height) * settings.height)));
    context.fillStyle = color;
    context.fillRect(x, y, 1, 1);
  };

  const drawPixel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawing) paintPixel(event);
  };

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || isEditableTarget(event.target)) return;
      event.preventDefault();
      setSpaceHeld(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setSpaceHeld(false);
      }
    };
    const handleWindowBlur = () => {
      setSpaceHeld(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  const panCanvasArea = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!spaceHeld) return;

    const canvasArea = canvasAreaRef.current;
    if (!canvasArea) return;

    canvasArea.scrollLeft -= event.movementX;
    canvasArea.scrollTop -= event.movementY;
  };

  const createCanvas = () => {
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
    setFileMenuOpen(false);
  };

  const saveImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !created) return;

    try {
      const result = await window.pixelStudio.saveImage(canvas.toDataURL("image/png"), settings.name);
      setStatusMessage(result.saved ? "Imagem salva em PNG." : "");
      setFileMenuOpen(false);
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
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = settings.background;
    context.fillRect(0, 0, settings.width, settings.height);
  };

  const selectPreset = (width: number, height: number) => {
    changeSetting("width", width);
    changeSetting("height", height);
  };

  const canvasScale = zoom;
  const canvasWidth = settings.width * canvasScale;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand">
            <div className="brand-mark"><Grid2X2 size={17} strokeWidth={2.5} /></div>
            <span>pixel<span className="brand-light">studio</span></span>
            <span className="version">BETA</span>
          </div>
          <div className="file-menu">
            <button
              className={`file-menu-trigger ${fileMenuOpen ? "active" : ""}`}
              aria-haspopup="menu"
              aria-expanded={fileMenuOpen}
              onClick={() => setFileMenuOpen((open) => !open)}
            >Arquivo</button>
            {fileMenuOpen && (
              <div className="file-menu-popover" role="menu" aria-label="Arquivo">
                <button className="file-menu-item" role="menuitem" onClick={startNewCanvas}>
                  <FilePlus2 size={15} /> Novo canvas <span>Ctrl+N</span>
                </button>
                <div className="file-menu-separator" />
                <button className="file-menu-item" role="menuitem" disabled={!created} onClick={() => void saveImage()}>
                  <Image size={15} /> Salvar imagem <span>Ctrl+S</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="document-title">
          <span className="status-dot" />
          {created ? settings.name : "Sem documento"}
        </div>
        <div className="topbar-actions">
          <button className="icon-button help-button" aria-label="Ajuda"><CircleHelp size={17} /></button>
          <button className="avatar" aria-label="Perfil">L</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="tool-rail" aria-label="Ferramentas">
          <div className="rail-group">
            <button
              className={`tool-button ${activeTool === "brush" ? "selected" : ""}`}
              onClick={() => setActiveTool("brush")}
              title="Pincel (B)"
              aria-label="Pincel"
            ><Paintbrush size={18} /></button>
            <button
              className={`tool-button ${activeTool === "select" ? "selected" : ""}`}
              onClick={() => setActiveTool("select")}
              title="Selecionar (V)"
              aria-label="Selecionar"
            ><MousePointer2 size={18} /></button>
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
          <div className="editor-toolbar">
            <div className="toolbar-left">
              <button className="toolbar-button" onClick={startNewCanvas}><FilePlus2 size={15} /> Novo canvas</button>
              <span className="toolbar-divider" />
              <button className="icon-button subtle" onClick={clearCanvas} title="Limpar canvas" aria-label="Limpar canvas"><RotateCcw size={15} /></button>
              <button className="icon-button subtle" title="Mais opções" aria-label="Mais opções"><MoreHorizontal size={17} /></button>
            </div>
            <div className="toolbar-right">
              <button className="icon-button subtle" onClick={() => adjustZoom(zoom < 1 ? -0.1 : -1)} aria-label="Diminuir zoom"><ZoomOut size={15} /></button>
              <span className="zoom-label">{Math.round(zoom * 100)}%</span>
              <button className="icon-button subtle" onClick={() => adjustZoom(zoom < 1 ? 0.1 : 1)} aria-label="Aumentar zoom"><ZoomIn size={15} /></button>
              <span className="toolbar-divider" />
              <button className="icon-button subtle" title="Ajustar à tela" aria-label="Ajustar à tela" onClick={() => setZoom(fitCanvasZoom())}><Sparkles size={15} /></button>
            </div>
          </div>

          <div
            ref={canvasAreaRef}
            className={`canvas-area ${created ? "has-canvas" : ""}${spaceHeld ? " space-pan" : ""}`}
            onPointerMove={panCanvasArea}
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
                  <canvas
                    ref={canvasRef}
                    className="art-canvas"
                    aria-label={`${settings.name}, ${settings.width} por ${settings.height} pixels`}
                    onPointerDown={(event) => {
                      if (spaceHeld) return;
                      setDrawing(true);
                      event.currentTarget.setPointerCapture(event.pointerId);
                      paintPixel(event);
                    }}
                    onPointerMove={drawPixel}
                    onPointerUp={() => setDrawing(false)}
                    onPointerCancel={() => setDrawing(false)}
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
          </div>

          <footer className="statusbar">
            <span className="status-hint">{statusMessage || (created ? "Pincel ativo · clique e arraste para desenhar" : "Pronto para criar")}</span>
            <span>{created ? `${settings.width} × ${settings.height} px` : "Desenhe e edite imagens com simplicidade."}</span>
          </footer>
        </section>

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
