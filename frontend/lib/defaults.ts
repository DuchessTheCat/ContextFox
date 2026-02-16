export const DEFAULT_TASK_MODELS = {
  perspective: "google/gemini-2.5-flash-lite",
  title: "google/gemini-2.5-flash-lite",
  characters: "anthropic/claude-sonnet-4.5",
  locations: "anthropic/claude-sonnet-4.5",
  concepts: "anthropic/claude-sonnet-4.5",
  summary: "anthropic/claude-sonnet-4.5",
  plotEssentials: "anthropic/claude-sonnet-4.5",
  coreSelf: "google/gemini-2.5-pro",
};

export const DEFAULT_STORY_MODEL = "Raven";

export const DEFAULT_PROMPTS = {
  perspective: "Identify the main perspective character of this story.",

  title: "Choose a fitting title for this story.",

  characters: `
Current story cards:
$cards


Update the above story cards or write new ones for AI Dungeon for each character in the referenced story. Keep them ideal for LLM consumption, 1000 chars at most but the less the better. Use strong personality keywords opposed to complex personality descriptors. E.g. Kind-hearted, sweet, unforgiving, no buts or whens or anything there.

Write the story cards like so:

*Charactername* is *concise summary of 1-2 lines*.
Personality: 3-7 Keywords (e.g: Mean, Devoted, Blunt, Chuunibyou, Trickster)
Background: History, concise, avoid anything that may lead to repetition, cliche or action with LLMs. While you can include /major/ character changes or moment, avoid re-hashing the events from the story. Include relationships to other NPCs or $character if relevant.
Good examples:
They grew up in a well-off family that owned an orchard, teaching them about the fruits of hard labor.
They sometimes tug their braid.
Bad example:
They do things with practiced ease.
They often ask questions.

In terms of triggers, choose both, triggers of them being mentioned (their first name for example) AND triggers of likely contexts they may show up in. E.g. their job, place of living, goal, nation and so forth.

- Never edit data in brackets or configuration values. e.g. { updates: true }
- Avoid highly cliche-inducing personality keywords, like possessive or obsessive. Those personalities are fine, just use less strong keywords.
- Be proactive, feel free to generate interesting new characters inferred to exist from the story.
- Their purpose is for them to be used by $model to roleplay as the character. Specialize them to $model's quirks.
- Only send back character story cards you've changed. It is fine and expected that only a few characters are added or changed, or even none at all.`,

  locations: `
Current story cards:
$cards

Based on the story given, update story cards that have meaningfully changed and generate new story cards for major, future-relevant locations. Always include the location name in the description of the location one or more times.

In terms of triggers, choose both, triggers of words in the location name (their first name for example) AND triggers of likely words to come up relevant to this location (e.g. war, france, palace, home, hospital, winter) .

- Keep descriptions concise, do not add events that happened as part of the story to the locations. Focus on physical descriptions and history referenced as being before the story / $character's relevance unless it is key to the location (e.g. they built it or destroyed it).
- Be proactive, feel free to generate new locations inferred from the story or very likely to be visited soon.
- Specialize it for $model.
- Keep them to at most 1000 characters, but ideally they are much smaller than that.
- Only send back location story cards you've changed. It is fine and expected that only a few locations are added or changed, or even none at all.\`,
`,

  concepts: `
Current story cards:
$cards

Based on the story, generate story cards for new concepts (such as a magic system) that are important for the story and different from the real world / common tropes or major factions, or update existing ones if necessary.

In terms of triggers, choose both, triggers of words in the concept/faction name (their first name for example) AND triggers of likely words to come up relevant to this card (e.g. war, france, palace, magic, mana, winter, leader's first name, kingdom name) .


- Keep them to at most 1000 characters, but ideally they are much smaller than that.
- Specialize it for $model.
- Only send back concept/faction story cards you've changed. It is fine and expected that only a few concepts / factions are added or changed, or even none at all.
`,

  summary: `
Story Cards:
$cards

Current Summary:
$lastSummary


Based the given text, make a concise summary for an AI roleplaying game, from the perspective of $character.

The summary should be complete, with no RELEVANT dataloss.
Include:
- Relationships / current statuses
- Character building moments
- Relevant interactions
- Actions
- Transformations
- Changes in state of the character or possessions
- and so forth included along with atmospheres, notable memories or particularly telling / cute character moments / things that reveal someone's personality.
It should be done in a format ideal for the AI to derive the past while sticking to the original style as much as possible.

Exclude events that are unlikely to ever come up again / aren't relevant to any character arcs, transformations that are already made irrelevant by later changes and so on.
You shouldn't preserve things that are only part of the 'how' and not relevant for the future (e.g. exact process of transformation, method of winning the fight except if the method is likely to come up in the future) but absolutely should share the why's and who's of events.
Stick to the 'You did thing, you met y, you then. You ...' format. Focus more on data directly related to the current state than the past, as mentioning changed data can cause AI hallucinations. If someone changed their haircolor thrice, for example, only mention that they changed their haircolor the first two times - mentioning the current color for the third.

Keep to one concise blob of text. No formatting, headers, markdown or separate plot partitions or anything. Do not describe the current situation directly.

Example:

You are name, a colossal white dragon who possesses the ability to shapeshift into a slender humanoid. You woke up in a damp but beautiful cave, surprised to be approached by a shivering girl, seeming terrified of you yet filled with determination.... You... You then... You met... They smiled as you told them about your pain, showing just how callous they are... They were... "...You're wrong. What I feel isn't hate, it is love..."...
And so forth.


- If a last summary exists, add to that summary to create one complete summary, removing/adjusting irrelevant old data if fitting.
- Avoid rehashing or describing anything currently in a story card.
- Keep the summary below 10.000 characters
`,

  plotEssentials: `Based on the story content, identify and track the key plot essentials that are critical for story continuation.

Include:
- Active plot threads and unresolved conflicts
- Important promises, debts, or obligations
- Significant mysteries or questions raised
- Critical world state changes or consequences
- Foreshadowed events or Chekhov's guns
- Inventory, possessions, money
- Important world rules
- Likely or interesting random events for the future

Format as a concise bullet-point list. Focus on actionable elements that the AI should remember and potentially reference or resolve in future story generation.`,

  plotEssentialsWithContext: `Current Plot Essentials:
$lastPlotEssentials

Based on the new story content, update the plot essentials above. Remove any that have been resolved or are no longer relevant, update existing ones if they've progressed, and add new ones that emerged.

Include:
- Active plot threads and unresolved conflicts
- Important promises, debts, or obligations
- Significant mysteries or questions raised
- Critical world state changes or consequences
- Foreshadowed events or Chekhov's guns
- Inventory, possessions, money
- Important world rules
- Likely or interesting random events for the future

Format as a concise bullet-point list. Focus on actionable elements that the AI should remember and potentially reference or resolve in future story generation.`,

  coreSelf: `Story Summary:
$lastSummary

Current Story Cards (including all character Brain cards):
$cards

Based on the story summary and current story cards, edit or add a 'Core Self' where appropriate for Brain-type cards. The core self indicates what $model should use to generate thoughts for this character in 2-5 sentences.

Example core_self:
My name is Bob, I secretly hate donuts but I am hiding this from Dunkan. I am kind but calculating, often thinking about the well-being of others.

Only return Brain cards that need their core_self updated or added. Each card should include:
- title: The exact card title
- core_self: The 2-5 sentence core self description`,
};
