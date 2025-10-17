import "./style.css";

document.title = "Sticker Sketchpad";
const title = document.createElement("h1");
title.textContent = "Sticker Sketchpad";
document.body.prepend(title);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.id = "canvas";
document.body.appendChild(canvas);

const clearBtn = document.createElement("button");
clearBtn.textContent = "Clear";
document.body.appendChild(clearBtn);

const ctx = canvas.getContext("2d")!;
if (!ctx) throw new Error("2D context not supported");

const displayList: { x: number; y: number }[][] = [];
let currentStroke: { x: number; y: number }[] | null = null;

function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw completed strokes
  for (const stroke of displayList) {
    if (stroke.length < 2) continue;
    const [first, ...rest] = stroke;
    if (!first) continue;

    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const point of rest) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }

  // Draw current stroke
  if (currentStroke && currentStroke.length >= 2) {
    const first = currentStroke[0]!;
    const rest = currentStroke.slice(1);

    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const point of rest) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }
}
function triggerRedraw() {
  canvas.dispatchEvent(new Event("drawing-changed"));
}

canvas.addEventListener("mousedown", (e: MouseEvent) => {
  if (e.buttons !== 1) return;
  currentStroke = [{ x: e.offsetX, y: e.offsetY }];
  triggerRedraw();
});

canvas.addEventListener("mousemove", (e: MouseEvent) => {
  if (!currentStroke || e.buttons !== 1) return;
  currentStroke.push({ x: e.offsetX, y: e.offsetY });
  triggerRedraw();
});

canvas.addEventListener("mouseup", () => {
  if (currentStroke && currentStroke.length > 0) {
    displayList.push(currentStroke);
    currentStroke = null;
    triggerRedraw();
  }
});

canvas.addEventListener("mouseleave", (e: MouseEvent) => {
  if (currentStroke && e.buttons === 1) {
    displayList.push(currentStroke);
    currentStroke = null;
    triggerRedraw();
  }
});

clearBtn.addEventListener("click", () => {
  displayList.length = 0;
  currentStroke = null;
  triggerRedraw();
});

canvas.addEventListener("drawing-changed", redrawCanvas);

triggerRedraw();
