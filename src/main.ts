import "./style.css";

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

  // Markers container
  const tools = document.createElement("div");
  tools.append(thinBtn, thickBtn);
  tools.style.margin = "8px 0";

  document.body.append(tools, canvas, clearBtn, undoBtn, redoBtn);

  return { canvas, clearBtn, undoBtn, redoBtn, thinBtn, thickBtn };
}

function createButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = label;
  return button;
}

const { canvas, clearBtn, undoBtn, redoBtn, thinBtn, thickBtn } = setupUI();
const ctx = canvas.getContext("2d")!;
if (!ctx) throw new Error("2D context not supported");

// -- Tool State --
let currentThickness = 2;

// -- UI: Highlight selected tool --
function updateToolUI() {
  thinBtn.classList.toggle("selectedTool", currentThickness === 2);
  thickBtn.classList.toggle("selectedTool", currentThickness === 8);
}

// Initialize
updateToolUI();

// --- Drawing Model ---
interface Drawable {
  display(ctx: CanvasRenderingContext2D): void;
}

class LineCommand implements Drawable {
  constructor(
    private points: { x: number; y: number }[],
    private thickness: number,
  ) {}

  static from(start: { x: number; y: number }, thickness: number): LineCommand {
    return new LineCommand([start], thickness);
  }

  drag(point: { x: number; y: number }) {
    this.points.push(point);
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
let currentStroke: LineCommand | null = null;

// --- Redraw Logic ---
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  displayList.forEach((stroke) => stroke.display(ctx));
  currentStroke?.display(ctx);

  // UX: disable buttons
  undoBtn.disabled = displayList.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

// --- Events ---
canvas.addEventListener("mousedown", (e) => {
  if (e.buttons !== 1) return;
  currentStroke = LineCommand.from(
    { x: e.offsetX, y: e.offsetY },
    currentThickness,
  );
  redraw();
});

canvas.addEventListener("mousemove", (e) => {
  if (!(currentStroke && e.buttons === 1)) return;
  currentStroke.drag({ x: e.offsetX, y: e.offsetY });
  redraw();
});

["mouseup", "mouseleave"].forEach((event) => {
  canvas.addEventListener(event, () => {
    if (!currentStroke || currentStroke.length === 0) return;
    displayList.push(currentStroke);
    currentStroke = null;
    redoStack.length = 0; // Invalidate redo on new stroke
    redraw();
  });
});

clearBtn.addEventListener("click", () => {
  displayList.length = 0;
  redoStack.length = 0;
  currentStroke = null;
  redraw();
});

undoBtn.addEventListener("click", () => {
  if (displayList.length === 0) return;
  const last = displayList.pop();
  if (last) redoStack.push(last);
  redraw();
});

redoBtn.addEventListener("click", () => {
  if (redoStack.length === 0) return;
  displayList.push(redoStack.pop()!);
  redraw();
});

thinBtn.addEventListener("click", () => {
  currentThickness = 2;
  updateToolUI();
});

thickBtn.addEventListener("click", () => {
  currentThickness = 8;
  updateToolUI();
});

// Initial draw
redraw();
