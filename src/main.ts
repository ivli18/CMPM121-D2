import "./style.css";

// Set page title
document.title = "Sticker Sketchpad";

// Add title heading
const title = document.createElement("h1");
title.textContent = "Sticker Sketchpad";
document.body.appendChild(title);

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

// Get 2D context
const ctx = canvas.getContext("2d");
if (!ctx) {
  console.error("Failed to get 2D context");
  throw new Error("Canvas 2D context not supported");
}

let isDrawing = false;

canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  // Start a new line at current position
  const { offsetX, offsetY } = e;
  ctx.beginPath();
  ctx.moveTo(offsetX, offsetY);
});

canvas.addEventListener("mousemove", (e) => {
  if (isDrawing) {
    const { offsetX, offsetY } = e;
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  }
});

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
});

canvas.addEventListener("mouseleave", () => {
  isDrawing = false; // So releasing outside still stops drawing
});

clearBtn.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
