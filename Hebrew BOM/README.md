# ספר מורמון — מהדורה עברית
## The Book of Mormon in Classical Biblical Hebrew

A bilingual web reader for the Book of Mormon translated into Classical Biblical Hebrew (*lĕšôn hamMiqrāʾ*), constrained to pre-exilic (600 BC) vocabulary and syntax.

### Features

- **Tri-mode language toggle** — Hebrew-only, side-by-side bilingual, Schottenstein-style interlinear, or English-only
- **Bilingual dual view** — English left, Hebrew right, verse numbers in a center spine (Hebrew letters above, Arabic numerals below)
- **Interlinear view** — phrase-by-phrase Hebrew over English in the style of the Schottenstein interlinear, flowing right-to-left
- **Full navigation** — sidebar with expandable book/chapter grid, prev/next chapter buttons, keyboard arrow keys
- **Search** — real-time search across both Hebrew and English text
- **Reading preferences** — light/dark theme, adjustable font size, position memory via localStorage
- **Responsive** — adapts to desktop, tablet, and mobile layouts
- **Zero dependencies** — vanilla HTML/CSS/JS, no frameworks, no build step

### Translation Methodology

- **Vocabulary**: Restricted to forms attested in the Hebrew Bible, with strong preference for pre-exilic usage
- **Syntax**: VSO word order, wayyiqtol narrative chains, construct chains over prepositional periphrasis
- **Theology**: Faithful to the source text's doctrinal content within categories available to ancient Israelite thought
- **Framework**: Ancient Near Eastern conceptual categories throughout — no Hellenistic overlay

### Files

```
index.html   — page structure
style.css    — all styling (light/dark themes, responsive breakpoints)
app.js       — application logic (navigation, rendering, search, localStorage)
data.json    — bilingual verse data (15 books, 239 chapters, 6,604 verses)
```

### Deployment

This is a static site. To deploy on GitHub Pages:

1. Push all four files to a repository
2. Go to **Settings → Pages**
3. Set source to the branch containing these files (e.g. `main`, root `/`)
4. The site will be live at `https://<username>.github.io/<repo-name>/`

No build step required. Works directly from the file system as well — just open `index.html` in a browser. (Note: `data.json` is fetched via `fetch()`, so a local server or GitHub Pages is needed; `file://` protocol may block the fetch depending on browser.)

### Data

- **Hebrew text**: Translated by Chris Lamb (30-year project, published תשפ״ו / 2026)
- **English text**: Public domain Book of Mormon text (via [bcbooks/scriptures-json](https://github.com/bcbooks/scriptures-json))
- **Verse pairing**: Aligned by verse number, not position — handles cases where translation verse counts differ

### License

Hebrew translation © Chris Lamb. English text is public domain.
