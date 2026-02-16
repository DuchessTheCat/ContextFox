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
  accumulatedSummary: string;
  accumulatedCards: StoryCard[];
  character: string;
  storyTitle: string;
  storyPath: string | null;
  cardsPath: string | null;
  storyContent?: string;
  cardsContent?: string;
}

export interface Task {
  id: string;
  name: string;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  context?: string;
  output?: string;
}
