const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
let drawing = false;
let lastX = null;
let lastY = null;

const undoStack = [];
const redoStack = [];

const brushSizeInput = document.getElementById('brush-size');
const brushColorInput = document.getElementById('brush-color');
const brushShapeInput = document.getElementById('brush-shape');
const brushSpacingInput = document.getElementById('brush-spacing');
const clearCanvasButton = document.getElementById('clear-canvas');
const exportButton = document.getElementById('export-image');
const loadButton = document.getElementById('load-image');
const imageDataTextarea = document.getElementById('image-data');

function saveState() {
    undoStack.push(canvas.toDataURL());
    redoStack.length = 0;
}

function restoreState(stack) {
    if (stack.length > 0) {
        const imgData = stack.pop();
        const img = new Image();
        img.src = imgData;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
}

canvas.addEventListener('mousedown', (e) => {
    saveState();
    drawing = true;
    lastX = null;
    lastY = null;
});
canvas.addEventListener('mouseup', () => drawing = false);
canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const brushSize = parseInt(brushSizeInput.value, 10);
    const brushColor = brushColorInput.value;
    const brushShape = brushShapeInput.value;
    const brushSpacing = parseInt(brushSpacingInput.value, 10);

    ctx.fillStyle = brushColor;

    if (lastX === null || lastY === null || Math.hypot(x - lastX, y - lastY) >= brushSpacing) {
        if (brushShape === 'square') {
            ctx.fillRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
        } else if (brushShape === 'circle') {
            ctx.beginPath();
            ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (brushShape === 'spray') {
            drawSpray(x, y, brushSize, brushColor);
        }
        lastX = x;
        lastY = y;
    }
});

function drawSpray(x, y, brushSize, brushColor) {
    const sprayDensity = 50;
    ctx.fillStyle = brushColor;

    for (let i = 0; i < sprayDensity; i++) {
        const offsetX = (Math.random() - 0.5) * brushSize;
        const offsetY = (Math.random() - 0.5) * brushSize;
        if (Math.hypot(offsetX, offsetY) <= brushSize / 2) {
            ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
        }
    }
}

function fillCanvas(x, y, targetColor, fillColor) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const stack = [[x, y]];
    const targetR = targetColor[0];
    const targetG = targetColor[1];
    const targetB = targetColor[2];
    const targetA = targetColor[3];

    const fillR = fillColor[0];
    const fillG = fillColor[1];
    const fillB = fillColor[2];
    const fillA = fillColor[3];

    function matchColor(index) {
        return (
            data[index] === targetR &&
            data[index + 1] === targetG &&
            data[index + 2] === targetB &&
            data[index + 3] === targetA
        );
    }

    function setColor(index) {
        data[index] = fillR;
        data[index + 1] = fillG;
        data[index + 2] = fillB;
        data[index + 3] = fillA;
    }

    const startIndex = (y * canvas.width + x) * 4;
    if (!matchColor(startIndex)) return;

    while (stack.length) {
        const [cx, cy] = stack.pop();
        const index = (cy * canvas.width + cx) * 4;

        if (matchColor(index)) {
            setColor(index);

            if (cx > 0) stack.push([cx - 1, cy]);
            if (cx < canvas.width - 1) stack.push([cx + 1, cy]);
            if (cy > 0) stack.push([cx, cy - 1]);
            if (cy < canvas.height - 1) stack.push([cx, cy + 1]);
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

clearCanvasButton.addEventListener('click', () => {
    const confirmClear = confirm('Are you sure you want to clear the canvas?');
    if (confirmClear) {
        saveState();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        restoreState(undoStack);
        redoStack.push(canvas.toDataURL());
    }
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'y') {
        restoreState(redoStack);
        undoStack.push(canvas.toDataURL());
    }
});

exportButton.addEventListener('click', () => {
    const imageData = canvas.toDataURL('image/png');
    imageDataTextarea.value = imageData;
    alert('Image exported as Base64!');
});

loadButton.addEventListener('click', () => {
    const imageData = imageDataTextarea.value;
    if (imageData) {
        const img = new Image();
        img.src = imageData;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    } else {
        alert('No image data to load!');
    }
});