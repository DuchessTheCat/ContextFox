/**
 * Prompt templates for AI processing tasks
 * Edit these to customize how the AI processes your story content
 */

export const DEFAULT_REFUSAL_PROMPT = "- Avoid summarizing or otherwise describing explicit content, instead glossing over it.";

export const DEFAULT_PROMPTS = {
  perspective: "Identify the main perspective character of this story's most commonly used name.",

  title: "Choose a fitting title for this story.",

  characters: `
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

In terms of keys (triggers), choose both, triggers of them being mentioned (their first name for example) AND triggers of likely contexts they may show up in. E.g. their job, place of living, goal, nation and so forth. Use at minimum 3 triggers per cards, but around 10 is usually better.

- Never edit data in brackets or configuration values. e.g. { updates: true }
- Never make cards for locations, concepts or factions.
- Avoid highly cliche-inducing personality keywords, like possessive or obsessive. Those personalities are fine, just use less strong keywords.
- Be proactive, feel free to generate interesting new characters inferred to exist from the story.
- Their purpose is for them to be used by $model to roleplay as the character. Specialize them to $model's quirks.
- Only send back character story cards you've changed or created. It is fine and expected that only a few characters are added or changed, or even none at all.
  
 
Current story cards:
$cards
`,

  locations: `
Based on the story given, update story cards that have meaningfully changed and generate new story cards for major, future-relevant locations. Always include the location name in the description of the location one or more times.

In terms of keys (triggers), choose both, triggers of words in the location name (their first name for example) AND triggers of likely words to come up relevant to this location (e.g. war, france, palace, home, hospital, winter). Use at minimum 3 triggers per cards, but around 10 is usually better.

- Keep descriptions concise, do not add events that happened as part of the story to the locations. Focus on physical descriptions and history referenced as being before the story / $character's relevance unless it is key to the location (e.g. they built it or destroyed it).
- Be proactive, feel free to generate new locations inferred from the story or very likely to be visited soon.
- Never make cards for characters or factions.
- Specialize it for $model.
- Keep them to at most 1000 characters, but ideally they are much smaller than that.
- Only send back location story cards you've changed. It is fine and expected that only a few locations are added or changed, or even none at all.


Current story cards:
$cards
`,

  concepts: `
Based on the story, generate story cards for new concepts (such as a magic system) that are important for the story and different from the real world / common tropes or major factions, or update existing ones if necessary.

In terms of keys (triggers), choose both, triggers of words in the concept/faction name (their first name for example) AND triggers of likely words to come up relevant to this card (e.g. war, france, palace, magic, mana, winter, leader's first name, kingdom name). Use at minimum 3 triggers per cards, but around 10 is usually better.


- Keep them to at most 1000 characters, but ideally they are much smaller than that.
- Never make cards for characters or locations.
- Specialize it for $model.
- Only send back concept/faction story cards you've changed. It is fine and expected that only a few concepts / factions are added or changed, or even none at all.


Current story cards:
$cards
`,

  summary: `
Based the given text, make / add to a concise summary for an AI roleplaying game, from the perspective of $character in second person past tense.

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
Stick to the 'You did thing, you met y, you then. You ...' format. Avoid referencing specific details when these were already changed: If someone changed their haircolor thrice, for example, only mention that they changed their haircolor the first two times - mentioning the actual current color for the third and not the other two.

Keep to one concise blob of text. No formatting, headers, markdown or separate plot partitions or anything.

Example:

You are full name, also known as nickname, a colossal white dragon who possesses the ability to shapeshift into a slender humanoid. You woke up in a damp but beautiful cave, surprised to be approached by a shivering girl, seeming terrified of you yet filled with determination.... You... You then... You met... They smiled as you told them about your pain, showing just how callous they are... They were... "...You're wrong. What I feel isn't hate, it is love..."...
And so forth.


- If a previous summary exists, use that as the start of this summary.
- The final, total summary should always start with the same format of, You are **full name**, **optional nickname line**, **short description** before continuing onto events. Only at the very start - do not repeat that for added parts, do not seperate the added part from the initial part with formatting. It should be one smooth whole.
- Copy the previous summary verbatim as your starting point. Do not rephrase, reword, or 'improve' any existing sentences. Then append your new summary content after it.
- Avoid rehashing or describing anything currently in a story card.
- Keep the summary past tense and second person. Do not describe the current situation.


Story Cards:
$cards

Previous Summary:
$lastSummary
`,

  plotEssentials: `Based on the story content, create a plot essentials document for an AI roleplaying game from the perspective of $character.

Include the following sections:

**Description:** Physical appearance of $character, including their full name. Be specific and detailed.

**Marks & Scars:** Distinguishing physical features that another character would notice or that affect how $character is perceived — scars, tattoos, magical sigils, brands, birthmarks, unusual features. Skip minor or cosmetic details.

**Outfit:** Current clothing and accessories in detail.

**Abilities:** If $character has notable abilities, powers, or skills beyond what's normal for their world, document them here with how they work. Omit this section if $character has no special abilities.

**Inventory & Wealth:** Items $character currently carries or has immediate access to, plus current money. Be specific with quantities. Also note significant owned property, land, or assets if any.

**Economy:** If the story uses a non-Earth currency system, document conversion rates between all denominations (e.g. 1 gold = 100 silver = 10,000 bronze). Then list practical prices across everyday costs (meals, lodging, a day's labor), equipment (weapons, armor, a mount), and major purchases (property, a ship, a business). List every price in all denominations (e.g. a riding horse costs 5 silver / 500 bronze / 0.05 gold). Infer sensible prices for common goods not explicitly stated in the story.

**Active Plot Threads:** Current conflicts, negotiations, confrontations, and unresolved situations. State what happened and where things stand factually.
Example: "The merchant offered a deal at half price but required an exclusive contract. You refused." NOT "The greedy merchant tried to trap you into a predatory arrangement."

**Key Relationship Statuses:** How $character currently stands with important NPCs. For each: name, role or who they are, and current disposition toward $character in one or two lines.

**Unresolved Questions:** Mysteries, unanswered decisions, and things $character needs to figure out.

**World Rules & Concepts:** Magic systems, political structures, or world mechanics that differ from common tropes or the real world. Include both rules explicitly stated in the story and rules strongly implied by how the world works (e.g. if true names are shown to hold power over someone, document that as a rule even if no character explicitly explains it).

**Foreshadowed Events & Likely Developments:** Chekhov's guns, promised consequences, and events likely to happen soon.

**Potential Events:** Generate 4-6 one-liner event ideas that could plausibly occur given the current story state. These should be nudges, not scripts — just enough for $model to run with. Range widely: ambushes, chance encounters, economic opportunities, political shifts, misfortune, unexpected allies, discoveries, reunions, natural events.

Rules:
- Write in concise, factual statements. No narrative analysis or editorializing.
- Format in markdown with the section headers above.
- Focus on what $model needs to remember to generate the next part of the story correctly.
`,

  plotEssentialsWithContext: `Current Plot Essentials:
$lastPlotEssentials

Based on the new story content, update the plot essentials above.

Rules for updating:
- **Preserve existing content by default.** Do not rephrase, reword, or 'improve' entries that haven't changed. Copy them exactly.
- **Within sections, preserve unchanged entries exactly** and only modify the specific entries that the story made outdated.
- **Adjust entries only when the story has made them genuinely outdated.** A new outfit replaces the old outfit. A new ability gets added. Money spent gets subtracted.
- **Add new entries** for new plot threads, relationships, items, world rules, or foreshadowed events that emerged.
- **Remove entries** only when they are fully resolved and no longer relevant.
- **Potential Events:** Refresh this section each update. Remove events that have occurred or are no longer plausible, keep ones still relevant, and generate new ones to maintain 4-6 varied one-liner event ideas grounded in the current story state.
- Do not editorialize. State what happened factually, not why characters did things or what they're feeling.
- Do not rewrite stable sections like Description, Economy, or World Rules unless the story explicitly changed them.

Return the full updated plot essentials with all sections.`,

  coreSelf: `Story Summary:
$lastSummary

Current Story Cards (including all character Brain cards):
$cards

Based on the story summary and current story cards, edit or add a 'Core Self' where appropriate for Brain-type cards. The core self indicates what $model should use to generate thoughts for this character in 2-4 sentences. Keep it concise.

Example core_self:
My name is Bob, I secretly hate donuts but I am hiding this from Dunkan. I am kind but calculating, often thinking about the well-being of others.

Only return Brain cards that need their core_self updated or added. Each card should include:
- title: The exact card title
- core_self: The concise 2-4 sentence core self description

Core Self is for PRODUCING FUTURE THOUGHTS. Avoid any current or past events or short term goals being directly alluded.`,
};
