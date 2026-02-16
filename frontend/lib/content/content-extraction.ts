/**
 * Handles extraction of story content from single files and zip parts
 */

export interface ContentExtractionResult {
  content: string;
  newLastLine: string;
  newPart: number;
}

export function extractSingleFileContent(
  fullContent: string,
  lastLineText: string
): ContentExtractionResult {
  let storyContent: string;

  if (!lastLineText) {
    storyContent = fullContent;
  } else {
    const pos = fullContent.lastIndexOf(lastLineText);
    if (pos !== -1) {
      storyContent = fullContent.substring(pos + lastLineText.length).trim();
    } else {
      storyContent = fullContent;
    }
  }

  if (!storyContent) {
    throw new Error("No new content to process");
  }

  const lines = storyContent.trimEnd().split("\n");
  const newLastLine = lines[lines.length - 1] || "";

  return {
    content: storyContent,
    newLastLine,
    newPart: 1,
  };
}

export function extractZipPartContent(
  zipParts: Map<number, string>,
  currentPart: number,
  lastLineText: string
): ContentExtractionResult {
  const currentPartContent = zipParts.get(currentPart);
  if (!currentPartContent) {
    throw new Error(`Part ${currentPart} not found in zip file`);
  }

  let storyContent: string;

  if (lastLineText) {
    const pos = currentPartContent.lastIndexOf(lastLineText);
    if (pos !== -1) {
      storyContent = currentPartContent.substring(pos + lastLineText.length).trim();
    } else {
      storyContent = currentPartContent;
    }
  } else {
    storyContent = currentPartContent;
  }

  // Check if current part is exhausted
  if (!storyContent) {
    if (currentPart < zipParts.size) {
      const nextPart = currentPart + 1;
      const nextPartContent = zipParts.get(nextPart);
      if (nextPartContent) {
        const allLines = nextPartContent.trimEnd().split("\n");
        return {
          content: nextPartContent,
          newLastLine: allLines[allLines.length - 1] || "",
          newPart: nextPart,
        };
      }
    }
    throw new Error("No new content to process");
  }

  const allLines = storyContent.trimEnd().split("\n");
  return {
    content: storyContent,
    newLastLine: allLines[allLines.length - 1] || "",
    newPart: currentPart,
  };
}

export function getPartIndicator(isZipFile: boolean, zipParts: Map<number, string> | undefined, currentPart: number): string {
  if (!isZipFile || !zipParts) return "";
  return ` (${currentPart}/${zipParts.size})`;
}
