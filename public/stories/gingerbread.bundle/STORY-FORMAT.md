# Story JSON Format Reference

## Top-Level Structure

```json
{
  "title": "Story Title",
  "storyId": "unique-story-id",
  "scenes": []
}
```

---

## Scene Types

### 1. `title`

The opening title card for the story.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | `"title"` |
| `lvl1` | Yes | First line of title (smaller text) |
| `lvl2` | Yes | Second line of title (larger text) |
| `author` | Yes | Author name |
| `illustrator` | Yes | Illustrator name |
| `background` | Yes | Background image filename |

---

### 2. `image`

A full-screen illustration with text overlay.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | `"image"` |
| `image` | Yes | Image path (e.g., `"story/cheers.png"`) |
| `text` | Yes | Narrative text displayed with the image |

---

### 3. `text`

Text displayed over a background image.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | `"text"` |
| `text` | Yes | Narrative text |
| `background` | Yes | Background image filename |

---

### 4. `clue-image`

An interactive scene where the player examines clues.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | `"clue-image"` |
| `image` | Yes | Scene image name (without extension) |
| `clueDescriptions` | Yes | Array of clue objects |

#### Clue Object

| Field | Required | Description |
|-------|----------|-------------|
| `hotspotName` | Yes | Identifier for the clickable area |
| `description` | Yes | Short description of the clue |
| `image` | Yes | Clue image name |
| `dialog` | Yes | What the character says when examining |

---

### 5. `character-flow`

A dialog sequence between characters, potentially with player input.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | `"character-flow"` |
| `background` | Yes | Background image filename |
| `left-character` | Yes | Character on the left side |
| `right-character` | Yes | Character on the right side |
| `flow` | Yes | Array of dialog/interaction items |

#### Optional Fields

| Field | Description |
|-------|-------------|
| `CharacterDescription` | Character to describe |
| `useClues` | Boolean - whether clues are available |
| `question` | The puzzle question to solve |
| `successAnswer` | Context/answer that leads to success |
| `wrongAnswers` | Array of wrong answer contexts |
| `hint` | Hint text for the player |

#### Flow Item Types

**Dialog line:**
```json
{
  "side": "left" | "right",
  "text": "Dialog text",
  "right-character": "optional-character-override"
}
```

**Player input:**
```json
{
  "type": "input"
}
```

**Quest prompt:**
```json
{
  "type": "quest"
}
```

---

### 6. `map`

A map screen showing a location.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | `"map"` |
| `image` | Yes | Map image filename |
| `location` | Yes | Location name to highlight |
