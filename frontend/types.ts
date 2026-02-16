export interface StoryCard {
  keys: string;
  value: string;
  type: string;
  title: string;
  description: string;
  useForCharacterCreation: boolean;
}

export interface StoryState {
  id: string;
  name: string;
  lastLine: string;
  currentPart: number; // For multi-part zip files (1-indexed)
  accumulatedSummary: string;
  accumulatedCards: StoryCard[];
  plotEssentials: string;
  character: string;
  storyTitle: string;
  storyPath: string | null;
  cardsPath: string | null;
  storyContent?: string;
  cardsContent?: string;
  isZipFile?: boolean;
  zipParts?: Map<number, string>; // part number -> content
  excludedCardTitles?: string[]; // Titles of cards excluded from AI updates
  includedCardTitles?: string[]; // Titles of cards explicitly included (overrides default exclusions)
}

export interface Task {
  id: string;
  name: string;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  context?: string;
  output?: string;
}
