export type ControlPointPair = {
  imageX: number;
  imageY: number;
  longitude: number;
  latitude: number;
};

export type AffineCoefficients = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

const EARTH_RADIUS_METERS = 6_371_000;

function solveLinearSystem(matrix: number[][], values: number[]): number[] {
  const size = values.length;
  const augmented = matrix.map((row, index) => [...row, values[index] ?? 0]);

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
    let maxRow = pivotIndex;
    for (let rowIndex = pivotIndex + 1; rowIndex < size; rowIndex += 1) {
      if (Math.abs(augmented[rowIndex][pivotIndex]) > Math.abs(augmented[maxRow][pivotIndex])) {
        maxRow = rowIndex;
      }
    }

    const pivotRow = augmented[maxRow];
    const pivotValue = pivotRow[pivotIndex];
    if (Math.abs(pivotValue) < 1e-12) {
      throw new Error("Transform is singular.");
    }

    if (maxRow !== pivotIndex) {
      augmented[maxRow] = augmented[pivotIndex];
      augmented[pivotIndex] = pivotRow;
    }

    for (let rowIndex = pivotIndex + 1; rowIndex < size; rowIndex += 1) {
      const factor = augmented[rowIndex][pivotIndex] / pivotValue;
      for (let columnIndex = pivotIndex; columnIndex <= size; columnIndex += 1) {
        augmented[rowIndex][columnIndex] -= factor * augmented[pivotIndex][columnIndex];
      }
    }
  }

  const solution = Array<number>(size).fill(0);
  for (let rowIndex = size - 1; rowIndex >= 0; rowIndex -= 1) {
    let sum = augmented[rowIndex][size];
    for (let columnIndex = rowIndex + 1; columnIndex < size; columnIndex += 1) {
      sum -= augmented[rowIndex][columnIndex] * solution[columnIndex];
    }
    solution[rowIndex] = sum / augmented[rowIndex][rowIndex];
  }

  return solution;
}

function solveLinearLeastSquares(rows: number[][], targets: number[]): number[] {
  const columnCount = rows[0]?.length ?? 0;
  if (columnCount === 0) {
    throw new Error("Transform is singular.");
  }

  const normalMatrix = Array.from({ length: columnCount }, () =>
    Array<number>(columnCount).fill(0),
  );
  const normalTargets = Array<number>(columnCount).fill(0);

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const target = targets[rowIndex] ?? 0;
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      normalTargets[columnIndex] += (row[columnIndex] ?? 0) * target;
      for (let innerIndex = 0; innerIndex < columnCount; innerIndex += 1) {
        normalMatrix[columnIndex][innerIndex] += (row[columnIndex] ?? 0) * (row[innerIndex] ?? 0);
      }
    }
  }

  return solveLinearSystem(normalMatrix, normalTargets);
}

export function haversineDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const latitudeDelta = ((latitudeB - latitudeA) * Math.PI) / 180;
  const longitudeDelta = ((longitudeB - longitudeA) * Math.PI) / 180;
  const latitudeARadians = (latitudeA * Math.PI) / 180;
  const latitudeBRadians = (latitudeB * Math.PI) / 180;

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeARadians) * Math.cos(latitudeBRadians) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function fitAffineTransform(points: ControlPointPair[]): AffineCoefficients {
  if (points.length < 3) {
    throw new Error("At least 3 control points are required.");
  }

  const rows = points.map((point) => [point.imageX, point.imageY, 1]);
  const longitudes = points.map((point) => point.longitude);
  const latitudes = points.map((point) => point.latitude);
  const [a, b, c] = solveLinearLeastSquares(rows, longitudes);
  const [d, e, f] = solveLinearLeastSquares(rows, latitudes);

  return { a, b, c, d, e, f };
}

export function pdfPixelToLonLat(coefficients: AffineCoefficients, imageX: number, imageY: number) {
  return {
    longitude: coefficients.a * imageX + coefficients.b * imageY + coefficients.c,
    latitude: coefficients.d * imageX + coefficients.e * imageY + coefficients.f,
  };
}

export function lonLatToPdfPixel(
  coefficients: AffineCoefficients,
  longitude: number,
  latitude: number,
) {
  const determinant = coefficients.a * coefficients.e - coefficients.b * coefficients.d;
  if (Math.abs(determinant) < 1e-12) {
    throw new Error("Transform is singular.");
  }

  const longitudeOffset = longitude - coefficients.c;
  const latitudeOffset = latitude - coefficients.f;

  return {
    imageX: (coefficients.e * longitudeOffset - coefficients.b * latitudeOffset) / determinant,
    imageY: (-coefficients.d * longitudeOffset + coefficients.a * latitudeOffset) / determinant,
  };
}

export function computeResidualStats(points: ControlPointPair[], coefficients: AffineCoefficients) {
  const perPointErrorsMeters = points.map((point) => {
    const predicted = pdfPixelToLonLat(coefficients, point.imageX, point.imageY);
    return haversineDistanceMeters(
      point.latitude,
      point.longitude,
      predicted.latitude,
      predicted.longitude,
    );
  });

  const sumSquared = perPointErrorsMeters.reduce((total, error) => total + error * error, 0);
  const rmseMeters = Math.sqrt(sumSquared / perPointErrorsMeters.length);
  const maxErrorMeters = Math.max(...perPointErrorsMeters);

  return {
    rmseMeters,
    maxErrorMeters,
    perPointErrorsMeters,
  };
}
