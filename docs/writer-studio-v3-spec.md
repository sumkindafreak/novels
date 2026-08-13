# WriteLite Writer Studio V3 — Locked Product & Implementation Specification

Status: **LOCKED**

This document is the source of truth for Writer Studio V3. The approved desktop and mobile mock-ups define the visual target. Implementation must preserve the core principle below and may only vary where browser/platform constraints require it.

> **The manuscript is always the most important thing on the screen. Everything else exists to help the writer, and everything else can disappear.**

## Product goal

WriteLite should be somewhere writers actively want to create work, not merely somewhere they upload finished writing. Writer Studio V3 is an immersive, safe, responsive writing environment with project planning, chapter management, autosave, recovery, notes, story-world tools, revision history, goals and publishing controls.

## Non-goals for V3

The following are deliberately excluded from this build so they do not dilute the core writing experience:

- music / atmosphere player
- AI-first writing experience
- simultaneous Google-Docs-style collaborative editing
- public writing rooms / sprints
- advanced publishing marketplace features

The architecture must leave room for these later without redesigning the Studio.

---

# 1. Locked desktop experience

## 1.1 Top bar

Always visible in normal Studio mode:

- WriteLite brand / exit to main site
- active project title and project switcher
- save state: `Saving…`, `Saved`, `Offline draft`, `Sync error`
- total project word count
- last edited time
- Focus Mode
- appearance/theme control where supported
- account menu

## 1.2 Left project rail

Primary project structure:

- Overview
- Chapters
- Notes
- Characters
- Places
- Drafts
- Trash

When Chapters is active, chapter rows show:

- drag handle
- title
- word count
- selection state
- optional status dot
- overflow menu

Chapter actions:

- create
- open
- rename
- duplicate
- reorder by drag and keyboard controls
- move up/down fallback
- send to trash
- restore from trash
- permanently delete only from Trash with explicit confirmation

Project progress card at the bottom:

- total words
- target words
- percentage
- planned chapter count where configured

## 1.3 Manuscript centre pane

The editor is visually dominant.

Header:

- chapter number/position
- chapter title
- optional scene title later

Editor toolbar:

- paragraph / heading style
- bold
- italic
- underline
- strike
- alignment
- bulleted list
- numbered list
- scene divider
- undo / redo
- more menu

Editor rules:

- comfortable max line width
- proper serif writing font by default
- plain text paste must remain clean
- typography controls affect the writer's workspace, not the public reader layout
- browser spellcheck remains available
- no tool may unexpectedly steal keyboard focus

## 1.4 Right Story Tools rail

Name is **Story Tools**, not AI Assistant.

Tabs/cards:

- Chapter Notes
- Characters in this chapter
- Goals
- Checklist

The rail is contextual to the current project/chapter.

It is collapsible independently from the left rail.

## 1.5 Bottom status bar

Persistent in normal mode:

- current chapter words
- total project words
- save/sync state
- undo/redo shortcut access
- zoom / manuscript scale
- distraction-free / focus control
- readability indicator
- estimated reading time

## 1.6 Focus Mode

Focus Mode removes both side rails and non-essential chrome.

Visible:

- manuscript
- chapter title
- subtle save state
- subtle word count
- one obvious exit control

The writer must never lose unsaved work when entering or leaving Focus Mode.

---

# 2. Locked mobile experience

Mobile is **not a compressed desktop layout**. It has feature parity reorganised around touch and the software keyboard.

## 2.1 Default mobile writing view

- manuscript occupies the screen
- compact top bar: back/project, chapter selector/title, save state, overflow
- compact/collapsible formatting strip
- word count at the lower edge when practical
- no permanent sidebars

## 2.2 Bottom navigation

Primary Studio navigation:

- Studio / Chapters
- Notes
- Tools
- More

The exact iconography may change, but these destinations and behaviours are fixed.

## 2.3 Mobile drawers / sheets

Open as slide-up or full-height sheets depending on content:

- Chapters
- Project overview
- Notes
- Characters
- Places
- Drafts
- Trash
- Goals
- Checklist

Drawers must not destroy editor state.

## 2.4 Mobile chapter management

- tap to open
- long-press/drag to reorder where reliable
- move up/down controls as accessibility fallback
- overflow actions for rename, duplicate and trash

## 2.5 Mobile Focus Mode

- manuscript-only presentation
- minimal top control to exit
- autosave continues
- keyboard-friendly viewport handling

---

# 3. Data architecture

Existing `stories` and `chapters` remain canonical for published/draft manuscript content.

V3 adds project-workspace data without replacing the public reading model.

## 3.1 Chapter extensions

Existing chapter data remains compatible. V3 adds fields only where needed for lifecycle/safety:

- soft-delete / trash state
- deleted timestamp
- optional chapter notes
- optional status metadata

## 3.2 Project settings

Per-story workspace settings:

- word target
- preferred manuscript font family token
- editor font size
- line height
- manuscript width / zoom
- last active chapter
- optional planned chapter count
- timestamps

## 3.3 Notes

Project and chapter notes:

- project owner
- story
- optional chapter
- title
- body
- note kind/category
- ordering
- timestamps

Private to the story owner unless a future collaboration feature explicitly changes that.

## 3.4 Characters

Per-story character records:

- name
- role
- summary
- description / private notes
- image URL optional
- ordering
- timestamps

Chapter-character links allow Story Tools to show “Characters in this chapter”.

## 3.5 Places

Per-story location/place records:

- name
- type optional
- summary
- description / private notes
- image URL optional
- ordering
- timestamps

## 3.6 Goals

Per story and optionally per chapter:

- title
- target type (`words`, `chapter`, `custom`)
- target value optional
- completed flag
- ordering
- timestamps

## 3.7 Checklist

Per story and optionally per chapter:

- label
- completed
- ordering
- timestamps

## 3.8 Revision snapshots

Revision system stores immutable snapshots of chapter text:

- story
- chapter
- owner
- title at snapshot
- content at snapshot
- word count
- snapshot reason (`autosave`, `manual`, `before_restore`, `before_delete`, `publish`)
- optional label
- timestamp

Revision history is private to the owner.

To control storage growth, automatic snapshots are throttled and should represent meaningful save points, not every keystroke.

## 3.9 Trash

Trash is soft-delete first.

Chapters sent to Trash:

- disappear from active chapter navigation
- remain recoverable
- retain revision history
- can be restored to an appropriate position

Permanent deletion requires a second explicit confirmation from Trash.

---

# 4. Save, sync and recovery contract

This is a core trust requirement.

## 4.1 Three-layer save model

1. **Immediate browser draft** — every meaningful edit is cached locally after a short debounce.
2. **Supabase autosave** — authenticated owner changes sync after a longer debounce and/or idle window.
3. **Revision snapshot** — periodically records a recoverable immutable version after meaningful change/time thresholds.

## 4.2 Save state indicator

Possible visible states:

- Saved
- Saving…
- Offline draft
- Sync error — retry
- Recovered draft

## 4.3 Conflict rule

On opening a chapter, if local draft content is newer than the server version and differs materially, Studio presents recovery choices instead of silently overwriting either copy.

## 4.4 Navigation rule

Before switching project/chapter or closing the Studio, pending local edits are flushed when possible. Local draft remains even if network save fails.

---

# 5. Accessibility contract

- all controls keyboard reachable
- visible focus states
- semantic buttons/labels
- no drag-only functionality; move buttons/keyboard alternative always exists
- scalable editor type
- line-height control
- manuscript width control
- reduced-motion preference respected
- high contrast remains readable
- touch targets sized appropriately on mobile
- Focus Mode does not trap keyboard users

Future accessibility additions may include dyslexia-friendly font choices, speech-to-text and text-to-speech, but the V3 structure must support them.

---

# 6. File architecture

V3 owns the writing experience and gradually supersedes the legacy chapter manager UI.

Primary files:

- `writer-studio-v3.css` — V3 desktop/mobile visual system
- `writer-studio-v3.js` — shell, state, editor, navigation and feature orchestration
- `supabase/writer_studio_v3.sql` — versioned schema/RLS/functions source
- `docs/writer-studio-v3-spec.md` — this locked specification

Existing older files remain loaded where other site/profile features rely on them, but their legacy writing UI is hidden while V3 is active.

No service-role/secret keys may appear in browser code.

---

# 7. Sprint plan — drafted in full before implementation

## Sprint 1 — Studio Foundation

Goal: replace the existing visible chapter-writing experience with the approved V3 shell while preserving working manuscript functionality.

Build:

- responsive V3 Studio shell
- desktop top/left/centre/right/bottom layout
- mobile writing-first shell and bottom navigation
- project switching
- chapter list and active chapter navigation
- chapter create
- chapter rename through editor title
- chapter reorder (drag where reliable + move buttons fallback)
- manuscript editor
- formatting controls for safe browser-supported rich-text operations where compatible
- live chapter/project word count
- estimated reading time
- save state
- existing local-draft recovery carried forward
- Supabase autosave
- Focus Mode
- legacy chapter manager hidden while V3 is active

Sprint 1 acceptance:

- existing owner can open each editable story and chapter
- typed content survives refresh through local draft recovery
- content can save to Supabase
- chapter switching does not silently discard pending edits
- mobile 360–430px viewport remains usable with keyboard
- desktop 1024px+ uses the approved three-pane visual model
- locked/version-controlled stories are clearly read-only rather than broken

## Sprint 2 — Story World & Planning

Goal: make the right/left rails useful enough that the Studio becomes a real project workspace.

Build:

- project Overview
- project word target / progress
- Notes section
- chapter notes
- Characters CRUD
- Characters-in-chapter links
- Places CRUD
- Goals CRUD
- Checklist CRUD
- Story Tools contextual cards
- mobile sheets for all planning tools
- search/filter inside Characters/Places when useful

Sprint 2 acceptance:

- all workspace data is private to story owner under RLS
- users cannot read or modify another writer's private planning data
- chapter-specific Story Tools update immediately when active chapter changes
- mobile tools are reachable without leaving/reloading the manuscript

## Sprint 3 — Draft Safety, Trash & Revision History

Goal: make WriteLite trustworthy for serious long-form work.

Build:

- soft-delete chapters to Trash
- restore from Trash
- permanent delete from Trash with explicit confirmation
- duplicate chapter
- revision snapshot table and history UI
- automatic throttled snapshots
- manual “Save snapshot”
- restore revision
- “before restore” safety snapshot
- draft conflict/recovery UI when local copy is newer
- revision metadata: time, words, label/reason

Sprint 3 acceptance:

- ordinary chapter delete is recoverable
- restoring an old revision never destroys the current version without first snapshotting it
- local/server divergence is never silently resolved by data loss
- revision data belongs only to the owner

## Sprint 4 — Writing Experience & Accessibility Polish

Goal: turn functional V3 into a writing environment people enjoy using for hours.

Build:

- typography preferences
- font-size control
- line-height control
- manuscript width / zoom
- light/paper/dark writing surface options if compatible with site theme
- improved Focus Mode
- distraction-free shortcuts
- keyboard shortcuts for formatting/save/focus
- scene-divider insertion
- find within chapter
- readability estimate
- stronger mobile keyboard/viewport handling
- reduced-motion support
- touch target/accessibility audit

Sprint 4 acceptance:

- writer appearance settings persist per project/user as designed
- writing preferences never alter public story formatting
- all critical operations work without drag gestures
- Focus Mode is fully usable on desktop and phone

## Sprint 5 — Publishing Bridge & Production Hardening

Goal: make the V3 Studio the normal route from idea to published story without duplicating separate forms.

Build:

- project metadata drawer: title, cover, synopsis, genre
- publication state visible in Studio
- Draft / Published workflow integration
- public preview from Studio
- publish checklist
- snapshot on publish/update
- warnings for empty title/content and obvious missing project metadata
- production error states and retry paths
- performance pass for long manuscripts/many chapters
- migration/compatibility checks with existing stories
- CI checks explicitly covering V3 files

Sprint 5 acceptance:

- writer can create/edit/manage/publish ordinary WriteLite stories without needing the old chapter manager
- public reader remains compatible with V3-saved chapters
- existing published content is not rewritten or reformatted by migration
- CI syntax/file checks pass
- GitHub Pages deployment succeeds

---

# 8. Implementation rules

1. **Draft first, then build.** This document is committed before Sprint 1 implementation begins.
2. Implement sprints sequentially. Each sprint must be verified before beginning the next.
3. Preserve existing stories and chapters. Schema changes are additive unless a verified migration explicitly requires otherwise.
4. Keep the public reader stable throughout the migration.
5. Never expose privileged Supabase credentials in frontend files.
6. Every newly exposed table uses RLS and explicit grants/policies.
7. Server-enforced ownership is authoritative; UI hiding is never treated as security.
8. Destructive actions are recoverable wherever practical.
9. Mobile has feature parity by reorganisation, not by squeezing the desktop layout.
10. The approved visual mock-ups remain the presentation target.

---

# 9. Definition of Writer Studio V3 complete

V3 is complete when a writer can:

1. open a project on desktop or phone;
2. create, write, rename, reorder, duplicate and safely trash chapters;
3. see trustworthy autosave/sync state;
4. recover local drafts and older revisions;
5. manage private notes, characters, places, goals and checklists;
6. enter an immersive Focus Mode;
7. personalise the writing surface without affecting readers;
8. preview and publish through the same Studio;
9. use all critical features through keyboard/touch-accessible controls;
10. trust that another user cannot access their private planning/revision data.

This specification is intentionally broader than a single release sprint. The visual structure and product contract are locked; later enhancements should extend this model rather than replace it.
