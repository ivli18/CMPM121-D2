import "./style.css";

let stickers = ["🐭", "✨", "🦎"];
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
  document.body.append(stickerTools, tools, canvas, clearBtn, undoBtn, redoBtn);

  return {
    canvas,
    clearBtn,
    undoBtn,
    redoBtn,
    thinBtn,
    thickBtn,
    stickerTools,
  };
}

function createButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = label;
  return button;
}

const { canvas, clearBtn, undoBtn, redoBtn, thinBtn, thickBtn } = setupUI();
const ctx = canvas.getContext("2d")!;
if (!ctx) throw new Error("2D context not supported");

// --- Tool State ---
type Tool =
  | { kind: "marker"; thickness: number }
  | { kind: "sticker"; emoji: string };

let currentTool: Tool = { kind: "marker", thickness: 2 };

// --- UI: Highlight selected tool ---
function updateToolUI() {
  thinBtn.classList.toggle(
    "selectedTool",
    currentTool.kind === "marker" && currentTool.thickness === 2,
  );
  thickBtn.classList.toggle(
    "selectedTool",
    currentTool.kind === "marker" && currentTool.thickness === 8,
  );
}

updateToolUI();

// --- Drawing Model ---
interface Drawable {
  display(ctx: CanvasRenderingContext2D): void;
}

// Now supports drag() for both lines and stickers
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
    ctx.strokeStyle = "gray";
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
    ctx.font = "24px system-ui, sans-serif"; // Better emoji support
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
    ctx.font = "24px system-ui, sans-serif";
    ctx.fillText(this.emoji, this.x, this.y);
  }
}

class LineCommand implements Draggable {
  private points: { x: number; y: number }[] = [];

  constructor(start: { x: number; y: number }, private thickness: number) {
    this.points.push(start);
  }

  static from(start: { x: number; y: number }, thickness: number): LineCommand {
    return new LineCommand(start, thickness);
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
    ctx.strokeStyle = "black";
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
let currentStroke: Draggable | null = null; // ✅ Unified type
let currentPreview: Drawable | null = null;

// --- Redraw Logic ---
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  displayList.forEach((item) => item.display(ctx));
  currentStroke?.display(ctx);
  currentPreview?.display(ctx);

  // UX: disable buttons
  undoBtn.disabled = displayList.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

// --- Events ---
canvas.addEventListener("mousedown", (e) => {
  if (e.buttons !== 1) return;

  const pos = { x: e.offsetX, y: e.offsetY };

  if (currentTool.kind === "sticker") {
    currentStroke = new StickerCommand(pos.x, pos.y, currentTool.emoji);
  } else {
    currentStroke = LineCommand.from(pos, currentTool.thickness);
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
  if (currentTool.kind === "sticker") {
    currentPreview = new StickerPreviewCommand(pos.x, pos.y, currentTool.emoji);
  } else {
    currentPreview = new PreviewCommand(pos.x, pos.y, currentTool.thickness);
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
  currentTool = { kind: "marker", thickness: 2 };
  updateToolUI();
});

thickBtn.addEventListener("click", () => {
  currentTool = { kind: "marker", thickness: 8 };
  updateToolUI();
});

// Initial draw
redraw();
