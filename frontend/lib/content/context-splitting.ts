/**
 * Context-aware file splitting logic
 */

export interface FileContent {
  storyContent?: string;
  zipParts?: Map<number, string>;
  isZipFile: boolean;
}

/**
 * Calculate minimum context length from selected models
 */
export function getMinimumContextLength(
  taskModels: Record<string, string>,
  modelContextLengths: Record<string, number>
): number {
  const modelsToCheck = [
    taskModels.perspective,
    taskModels.title,
    taskModels.characters,
    taskModels.locations,
    taskModels.concepts,
    taskModels.summary,
    taskModels.plotEssentials,
    taskModels.coreSelf,
  ];

  let minContext = Infinity;
  for (const model of modelsToCheck) {
    const contextLength = modelContextLengths[model];
    if (contextLength && contextLength < minContext) {
      minContext = contextLength;
    }
  }

  return minContext === Infinity ? 0 : minContext;
}

/**
 * Split file content into halves if needed, splitting on line boundaries
 */
export function splitContentIfNeeded(content: string, minContextLength: number): string[] {
  if (minContextLength > 0 && minContextLength < 150000) {
    const lines = content.split("\n");
    const midpoint = Math.floor(lines.length / 2);
    const firstHalf = lines.slice(0, midpoint).join("\n");
    const secondHalf = lines.slice(midpoint).join("\n");
    return [firstHalf, secondHalf];
  }

  return [content];
}

/**
 * Apply context-aware splitting to file content
 */
export function applySplitting(
  fileContent: FileContent,
  minContextLength: number
): { zipParts?: Map<number, string>; storyContent?: string; isZipFile: boolean } {
  // If context is sufficient, return as-is
  if (minContextLength === 0 || minContextLength >= 150000) {
    return fileContent;
  }

  // Split zip parts
  if (fileContent.zipParts) {
    const splitMap = new Map<number, string>();
    let newPartNumber = 1;

    for (const [, content] of Array.from(fileContent.zipParts.entries()).sort(
      (a, b) => a[0] - b[0]
    )) {
      const splits = splitContentIfNeeded(content, minContextLength);
      for (const split of splits) {
        splitMap.set(newPartNumber++, split);
      }
    }

    return {
      zipParts: splitMap,
      isZipFile: true,
    };
  }

  // Split single file
  if (fileContent.storyContent) {
    const splits = splitContentIfNeeded(fileContent.storyContent, minContextLength);
    if (splits.length > 1) {
      return {
        zipParts: new Map(splits.map((content, idx) => [idx + 1, content])),
        isZipFile: true,
      };
    }
  }

  return fileContent;
}

/**
 * Get status message for splitting
 */
export function getSplitStatusMessage(
  originalPartsCount: number,
  newPartsCount: number,
  minContextLength: number
): string {
  return `Low context detected (${Math.floor(
    minContextLength / 1000
  )}k). Split ${originalPartsCount} file${
    originalPartsCount !== 1 ? "s" : ""
  } into ${newPartsCount} parts.`;
}
