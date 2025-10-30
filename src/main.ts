import "./style.css";

const stickers = ["🐭", "✨", "🦎"];
function renderStickerBar(container: HTMLElement) {
  container.innerHTML = "";
  stickers.forEach((emoji) => {
    const btn = createButton(emoji);
    btn.style.fontSize = "1.5em";
    btn.addEventListener("click", () => {
      currentTool = { kind: "sticker", emoji };
    });
    container.append(btn);
  });
}

// --- Setup ---
function setupUI() {
  const title = document.createElement("h1");
  title.textContent = "Sticker Sketchpad";
  document.body.prepend(title);

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  canvas.id = "canvas";

  const clearBtn = createButton("Clear");
  const undoBtn = createButton("Undo");
  const redoBtn = createButton("Redo");
  const thinBtn = createButton("Thin");
  const thickBtn = createButton("Thick");
  const exportBtn = createButton("Export");

  const controlBar = document.createElement("div");
  controlBar.append(undoBtn, redoBtn, clearBtn, exportBtn);
  controlBar.style.display = "flex";
  controlBar.style.gap = "8px";
  controlBar.style.margin = "8px 0";

  // Marker tools
  const tools = document.createElement("div");
  tools.append(thinBtn, thickBtn);
  tools.style.margin = "8px 0";

  // Sticker tools
  const stickerTools = document.createElement("div");
  const addStickerBtn = createButton("➕");
  renderStickerBar(stickerTools);
  stickerTools.append(addStickerBtn);
  addStickerBtn.addEventListener("click", () => {
    const input = prompt("Custom sticker text", "🧽");
    if (input && input.trim()) {
      stickers.push(input.trim());
      renderStickerBar(stickerTools);
      stickerTools.append(addStickerBtn);
    }
  });

  document.body.append(stickerTools, tools, canvas, controlBar);
  return {
    canvas,
    clearBtn,
    undoBtn,
    redoBtn,
    thinBtn,
    thickBtn,
    exportBtn,
    stickerTools,
  };
}

function createButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = label;
  return button;
}

const { canvas, clearBtn, undoBtn, redoBtn, thinBtn, thickBtn, exportBtn } =
  setupUI();
const ctx = canvas.getContext("2d")!;
if (!ctx) throw new Error("2D context not supported");

// --- Tool State ---
type Tool =
  | { kind: "marker"; thickness: number; color: string }
  | { kind: "sticker"; emoji: string };

let currentTool: Tool = { kind: "marker", thickness: 2, color: "black" };

// --- UI: Highlight selected tool ---
function updateToolUI() {
  const isThin = currentTool.kind === "marker" && currentTool.thickness === 2;
  const isThick = currentTool.kind === "marker" && currentTool.thickness === 6;

  thinBtn.classList.toggle("selectedTool", isThin);
  thickBtn.classList.toggle("selectedTool", isThick);

  // Only set background if current tool is marker
  if (currentTool.kind === "marker") {
    thinBtn.style.backgroundColor = isThin ? currentTool.color : "";
    thickBtn.style.backgroundColor = isThick ? currentTool.color : "";
  } else {
    thinBtn.style.backgroundColor = "";
    thickBtn.style.backgroundColor = "";
  }
}

updateToolUI();

// Random Color
function randomColor() {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h}, 70%, 50%)`;
}

// --- Drawing Model ---
interface Drawable {
  display(ctx: CanvasRenderingContext2D): void;
}

interface Draggable extends Drawable {
  drag(pos: { x: number; y: number }): void;
}

class PreviewCommand implements Drawable {
  constructor(
    private x: number,
    private y: number,
    private thickness: number,
  ) {}

  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = currentTool.kind === "marker"
      ? currentTool.color
      : "gray";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class StickerPreviewCommand implements Drawable {
  constructor(private x: number, private y: number, private emoji: string) {}

  display(ctx: CanvasRenderingContext2D) {
    const size = Math.floor(canvas.height / 6);
    ctx.font = `${size}px system-ui, sans-serif`;
    ctx.fillText(this.emoji, this.x, this.y);
  }
}

class StickerCommand implements Draggable {
  constructor(private x: number, private y: number, private emoji: string) {}

  drag(pos: { x: number; y: number }) {
    this.x = pos.x;
    this.y = pos.y;
  }

  display(ctx: CanvasRenderingContext2D) {
    const size = Math.floor(canvas.height / 6);
    ctx.font = `${size}px system-ui, sans-serif`;
    ctx.fillText(this.emoji, this.x, this.y);
  }
}

class LineCommand implements Draggable {
  private points: { x: number; y: number }[] = [];

  constructor(
    start: { x: number; y: number },
    private thickness: number,
    private color: string,
  ) {
    this.points.push(start);
  }

  static from(
    start: { x: number; y: number },
    thickness: number,
    color: string,
  ): LineCommand {
    return new LineCommand(start, thickness, color);
  }

  drag(pos: { x: number; y: number }) {
    this.points.push(pos);
  }

  get length(): number {
    return this.points.length;
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 2) return;
    ctx.lineWidth = this.thickness;
    ctx.lineCap = "round";
    ctx.strokeStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.points[0]!.x, this.points[0]!.y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i]!.x, this.points[i]!.y);
    }
    ctx.stroke();
  }
}

// --- State ---
const displayList: Drawable[] = [];
const redoStack: Drawable[] = [];
let currentStroke: Draggable | null = null;
let currentPreview: Drawable | null = null;

// --- Redraw Logic ---
function redraw() {
  // Set canvas background (non-transparent)
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw all completed items
  displayList.forEach((item) => item.display(ctx));
  currentStroke?.display(ctx);
  currentPreview?.display(ctx);

  // Update button states
  undoBtn.disabled = displayList.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

// --- Events ---
canvas.addEventListener("mousedown", (e) => {
  if (e.buttons !== 1) return;
  const pos = { x: e.offsetX, y: e.offsetY };
  if (currentTool.kind === "marker") {
    currentStroke = LineCommand.from(
      pos,
      currentTool.thickness,
      currentTool.color,
    );
  } else {
    currentStroke = new StickerCommand(pos.x, pos.y, currentTool.emoji);
  }
  redraw();
});

canvas.addEventListener("mousemove", (e) => {
  const pos = { x: e.offsetX, y: e.offsetY };

  if (currentStroke && e.buttons === 1) {
    currentStroke.drag(pos);
    redraw();
    return;
  }

  // Update preview
  if (currentTool.kind === "marker") {
    currentPreview = new PreviewCommand(pos.x, pos.y, currentTool.thickness);
  } else {
    currentPreview = new StickerPreviewCommand(pos.x, pos.y, currentTool.emoji);
  }
  redraw();
});

canvas.addEventListener("mouseup", () => {
  if (currentStroke) {
    displayList.push(currentStroke);
    currentStroke = null;
    redoStack.length = 0;
  }
  currentPreview = null;
  redraw();
});

canvas.addEventListener("mouseleave", () => {
  currentPreview = null;
  redraw();
});

// Button actions
clearBtn.addEventListener("click", () => {
  displayList.length = 0;
  redoStack.length = 0;
  currentStroke = null;
  redraw();
});

undoBtn.addEventListener("click", () => {
  if (displayList.length === 0) return;
  const last = displayList.pop()!;
  redoStack.push(last);
  redraw();
});

redoBtn.addEventListener("click", () => {
  if (redoStack.length === 0) return;
  displayList.push(redoStack.pop()!);
  redraw();
});

thinBtn.addEventListener("click", () => {
  currentTool = { kind: "marker", thickness: 2, color: randomColor() };
  updateToolUI();
  thinBtn.style.backgroundColor = currentTool.color;
});

thickBtn.addEventListener("click", () => {
  currentTool = { kind: "marker", thickness: 6, color: randomColor() };
  updateToolUI();
  thinBtn.style.backgroundColor = currentTool.color;
});

exportBtn.addEventListener("click", () => {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportCtx = exportCanvas.getContext("2d")!;
  exportCtx.scale(4, 4);
  displayList.forEach((item) => item.display(exportCtx));
  const anchor = document.createElement("a");
  anchor.href = exportCanvas.toDataURL("image/png");
  anchor.download = "sketchpad.png";
  anchor.click();
});

// Initial draw
redraw();
