# Pixel artwork tools

Open **Developer mode → Pixel artwork** to paint backgrounds and assets.
Character sprite details use the same selection and color-picking workflow.

For a background, **Show assets** displays placed objects as a guide. Turn it
off to see the background by itself. This switch affects the editor view;
painting, color sampling, copying, and PNG export use the background pixels.

The **Eyedropper** samples once and returns to the tool you were using.
The **I** shortcut selects it. **Alt-click** samples without changing tools.

To use **Stamp**:

1. Use **Select** to draw a rectangle around the pixels to copy.
2. Choose **Stamp**, then **Ctrl-click** (**Command-click** on Mac) to capture
   that selection.
3. Adjust **Stamp width** and **Stamp height** for the copies you want to place.
4. Click to stamp. Keep clicking to place more copies of the captured pixels.

On touch screens, use **Capture selection** instead of Ctrl-click.

The stamp keeps its captured source until you capture another selection or
clear it with Escape. Resizing preserves sharp pixel edges and transparency.
Each placement can be undone separately.

## Smooth gradients

Choose **Smooth gradients** in the Tool menu, or press **U** over the artwork
canvas. Drag over a harsh color transition to blend neighboring colors with a
soft, round brush. **Brush radius** uses source-image pixels; **Strength %**
controls how much each stroke blends. The selected paint color is not used.
Transparency is preserved. Each complete stroke is one artwork Undo step;
Escape cancels a stroke before applying it.

## Protect details with a mask

Choose **Mask protected areas** and paint over details you want to keep sharp.
The magenta overlay marks protected pixels. Switch to **Smooth gradients** to
blend the surrounding unprotected artwork. **Unmask areas** removes protection,
**Undo mask** reverses a mask edit, and **Clear protection mask** removes it all.
Use **Show protection mask** to show or hide the overlay.

A protection mask is an editing guide for the current artwork. It survives
artwork Undo/Redo and changing tools, but selecting another artwork clears it.
The overlay is not part of PNG exports or saved world-project pixels.

## Select a specific shape

1. Choose **Select**, then set **Selection shape → Manual shape**.
2. Click or tap points around the desired outline.
3. Choose **Finish selection**, press Enter, or double-click to close the shape.
4. Copy/paste, capture a stamp, or smooth inside the finished shape.

**Rectangle** remains available for drag selections. Copied manual shapes keep
their outline when pasted or resized as stamps; transparent pixels inside the
shape still replace their destination. Pixels outside the shape are untouched.

For a precise protection mask, finish a manual selection and choose **Protect
selection**, then **Clear selection** to smooth around the protected shape.
Use **Clear selection** or Escape to remove an active selection. Escape while
drawing an unfinished outline cancels that draft.
