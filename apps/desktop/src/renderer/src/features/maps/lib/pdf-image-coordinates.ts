type ImageCoordinateElement = HTMLCanvasElement | HTMLImageElement;

function imagePixelDimensions(element: ImageCoordinateElement) {
  if (element instanceof HTMLCanvasElement) {
    return { width: element.width, height: element.height };
  }

  return { width: element.naturalWidth, height: element.naturalHeight };
}

export function getImageCoordinatesFromPointer(
  element: ImageCoordinateElement,
  clientX: number,
  clientY: number,
) {
  const rect = element.getBoundingClientRect();
  const { width, height } = imagePixelDimensions(element);
  const scaleX = width / rect.width;
  const scaleY = height / rect.height;

  return {
    imageX: (clientX - rect.left) * scaleX,
    imageY: (clientY - rect.top) * scaleY,
  };
}

export function getImageCoordinatesFromClick(
  element: ImageCoordinateElement,
  event: { clientX: number; clientY: number },
) {
  return getImageCoordinatesFromPointer(element, event.clientX, event.clientY);
}
