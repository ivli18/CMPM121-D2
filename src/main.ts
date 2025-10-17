import "./style.css";

// Set title
document.title = "Sticker Sketchpad";
const title = document.createElement("h1");
title.textContent = "Sticker Sketchpad";
document.body.prepend(title);

// Create canvas
const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.id = "canvas";
document.body.appendChild(canvas);

// Add clear button
const clearBtn = document.createElement("button");
clearBtn.textContent = "Clear";
document.body.appendChild(clearBtn);

// Get context
const ctx = canvas.getContext("2d")!;
if (!ctx) throw new Error("2D context not supported");

// Drawing state
const displayList: { x: number; y: number }[][] = [];
let currentStroke: { x: number; y: number }[] | null = null;

// Redraw only when event fires
function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw completed strokes
  displayList.forEach((stroke) => {
    if (stroke.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    stroke.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  });
  // Draw current stroke
  if (currentStroke && currentStroke.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
    currentStroke.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  }
}

// Trigger redraw via event (not direct call)
function triggerRedraw() {
  canvas.dispatchEvent(new Event("drawing-changed"));
}

// Start stroke
canvas.addEventListener("mousedown", (e) => {
  if (e.buttons !== 1) return;
  currentStroke = [{ x: e.offsetX, y: e.offsetY }];
  triggerRedraw();
});

// Continue stroke
canvas.addEventListener("mousemove", (e) => {
  if (!currentStroke || e.buttons !== 1) return;
  currentStroke.push({ x: e.offsetX, y: e.offsetY });
  triggerRedraw(); // ✅ Event-driven redraw — Observer pattern!
});

// End stroke (mouse up or leave)
canvas.addEventListener("mouseup", () => {
  if (currentStroke && currentStroke.length > 0) {
    displayList.push(currentStroke);
    currentStroke = null;
    triggerRedraw();
  }
});

canvas.addEventListener("mouseleave", () => {
  if (currentStroke && e.buttons === 1) {
    displayList.push(currentStroke);
    currentStroke = null;
    triggerRedraw();
  }
});

// Clear canvas
clearBtn.addEventListener("click", () => {
  displayList.length = 0;
  currentStroke = null;
  triggerRedraw();
});

// Subscribe to changes
canvas.addEventListener("drawing-changed", redrawCanvas);

// Initial draw
triggerRedraw();
