export function getImageCoordinatesFromPointer(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    imageX: (clientX - rect.left) * scaleX,
    imageY: (clientY - rect.top) * scaleY,
  };
}

export function getImageCoordinatesFromClick(
  canvas: HTMLCanvasElement,
  event: React.MouseEvent<HTMLElement>,
) {
  return getImageCoordinatesFromPointer(canvas, event.clientX, event.clientY);
}
