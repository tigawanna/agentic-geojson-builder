export type ControlPointPair = {
  imageX: number;
  imageY: number;
  longitude: number;
  latitude: number;
};

export type ControlPointPairWithId = ControlPointPair & {
  id: number;
};

export type RobustAffineFitResult = {
  coefficients: AffineCoefficients;
  inlierIds: number[];
  excludedIds: number[];
  inlierStats: {
    rmseMeters: number;
    maxErrorMeters: number;
  };
  perPointErrors: Array<{
    controlPointId: number;
    errorMeters: number;
    isInlier: boolean;
  }>;
};

const ROBUST_INLIER_MAX_ERROR_METERS = 75;

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
      const candidateRow = augmented[rowIndex];
      const currentMaxRow = augmented[maxRow];
      if (!candidateRow || !currentMaxRow) {
        continue;
      }

      const candidatePivot = candidateRow[pivotIndex] ?? 0;
      const currentMaxPivot = currentMaxRow[pivotIndex] ?? 0;
      if (Math.abs(candidatePivot) > Math.abs(currentMaxPivot)) {
        maxRow = rowIndex;
      }
    }

    const pivotRow = augmented[maxRow];
    if (!pivotRow) {
      throw new Error("Transform is singular.");
    }

    const pivotValue = pivotRow[pivotIndex];
    if (pivotValue === undefined || Math.abs(pivotValue) < 1e-12) {
      throw new Error("Transform is singular.");
    }

    if (maxRow !== pivotIndex) {
      const swapRow = augmented[pivotIndex];
      if (!swapRow) {
        throw new Error("Transform is singular.");
      }
      augmented[maxRow] = swapRow;
      augmented[pivotIndex] = pivotRow;
    }

    for (let rowIndex = pivotIndex + 1; rowIndex < size; rowIndex += 1) {
      const targetRow = augmented[rowIndex];
      const normalizedPivotRow = augmented[pivotIndex];
      if (!targetRow || !normalizedPivotRow) {
        continue;
      }

      const targetPivot = targetRow[pivotIndex] ?? 0;
      const factor = targetPivot / pivotValue;
      for (let columnIndex = pivotIndex; columnIndex <= size; columnIndex += 1) {
        const pivotCell = normalizedPivotRow[columnIndex] ?? 0;
        targetRow[columnIndex] = (targetRow[columnIndex] ?? 0) - factor * pivotCell;
      }
    }
  }

  const solution = Array<number>(size).fill(0);
  for (let rowIndex = size - 1; rowIndex >= 0; rowIndex -= 1) {
    const row = augmented[rowIndex];
    if (!row) {
      throw new Error("Transform is singular.");
    }

    let sum = row[size] ?? 0;
    for (let columnIndex = rowIndex + 1; columnIndex < size; columnIndex += 1) {
      sum -= (row[columnIndex] ?? 0) * (solution[columnIndex] ?? 0);
    }

    const divisor = row[rowIndex];
    if (divisor === undefined || Math.abs(divisor) < 1e-12) {
      throw new Error("Transform is singular.");
    }

    solution[rowIndex] = sum / divisor;
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
    if (!row) {
      continue;
    }

    const target = targets[rowIndex] ?? 0;
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const cell = row[columnIndex] ?? 0;
      normalTargets[columnIndex] = (normalTargets[columnIndex] ?? 0) + cell * target;
      const matrixRow = normalMatrix[columnIndex];
      if (!matrixRow) {
        continue;
      }

      for (let innerIndex = 0; innerIndex < columnCount; innerIndex += 1) {
        matrixRow[innerIndex] = (matrixRow[innerIndex] ?? 0) + cell * (row[innerIndex] ?? 0);
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

  if (
    a === undefined ||
    b === undefined ||
    c === undefined ||
    d === undefined ||
    e === undefined ||
    f === undefined
  ) {
    throw new Error("Transform is singular.");
  }

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

export function fitAffineTransformRobust(points: ControlPointPairWithId[]): RobustAffineFitResult {
  if (points.length < 3) {
    throw new Error("At least 3 control points are required.");
  }

  let inliers = [...points];
  const excludedIds: number[] = [];

  while (true) {
    const coefficients = fitAffineTransform(inliers);
    const inlierStats = computeResidualStats(inliers, coefficients);
    const shouldStop =
      inlierStats.maxErrorMeters <= ROBUST_INLIER_MAX_ERROR_METERS || inliers.length <= 3;

    if (shouldStop) {
      const excludedIdSet = new Set(excludedIds);
      const perPointErrors = points.map((point) => {
        const predicted = pdfPixelToLonLat(coefficients, point.imageX, point.imageY);
        const errorMeters = haversineDistanceMeters(
          point.latitude,
          point.longitude,
          predicted.latitude,
          predicted.longitude,
        );
        return {
          controlPointId: point.id,
          errorMeters,
          isInlier: !excludedIdSet.has(point.id),
        };
      });

      return {
        coefficients,
        inlierIds: inliers.map((point) => point.id),
        excludedIds,
        inlierStats: {
          rmseMeters: inlierStats.rmseMeters,
          maxErrorMeters: inlierStats.maxErrorMeters,
        },
        perPointErrors,
      };
    }

    let worstIndex = 0;
    let worstError = -1;
    for (let index = 0; index < inlierStats.perPointErrorsMeters.length; index += 1) {
      const error = inlierStats.perPointErrorsMeters[index] ?? 0;
      if (error > worstError) {
        worstError = error;
        worstIndex = index;
      }
    }

    const removed = inliers[worstIndex];
    if (!removed) {
      break;
    }

    excludedIds.push(removed.id);
    inliers = inliers.filter((_, index) => index !== worstIndex);
  }

  throw new Error("Transform is singular.");
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
