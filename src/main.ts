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
