# Guided assembly UX

## Goal

A first-time user should know what to do now, why it matters, what success looks like and what to do next. Assembly needs explicit user knowledge about cutting, placement and sewing; the interface should collect that knowledge through recognisable actions.

## References reviewed

- [CLO: Segment Sewing](https://support.clo3d.com/hc/en-us/articles/115012381248-Segment-Sewing): choose the first and second edges directly; preview sewing direction and length differences.
- [CLO: 3D Sewing](https://support.clo3d.com/hc/en-us/articles/360007863993-3D-Sewing): connect visible geometry in the 3D workspace.
- [CLO interface screenshot in its support community](https://support.clo3d.com/hc/en-us/community/posts/1500000160281-Autosewing-has-stopped-working-for-darts-and-pleats): reference for a flat pattern view beside the garment and contextual sewing tools. The screenshot search also surfaced the [sewing property editor](https://support.clo3d.com/hc/en-us/community/posts/7353717255961-Seam-is-visible-on-right-side-but-not-visible-on-left-side). Image search descriptions were available; direct image download was denied with HTTP 403, so detailed visual comparisons were limited.
- [Marvelous Designer: Segment Sewing (2D)](https://support.marvelousdesigner.com/hc/en-us/articles/47358199517209-Segment-Sewing-2D): pair outline segments with endpoint-direction and length feedback.
- [Creative Bloq's Marvelous Designer 2024 review and interface screenshots](https://www.creativebloq.com/reviews/marvelous-designer-2024): a positive assessment of its clothing workflow, alongside a warning that mastering it takes time.
- [G2: CLO 3D Fashion reviews](https://www.g2.com/products/clo-3d-fashion/reviews): the page reported 4.6/5 from seven reviews when researched on 16 October 2026. Positive comments about straightforward design tools coexist with complaints about the learning curve. This is a small review sample, not evidence that all beginners find the software easy.

The useful inspiration is direct selection, two linked views and immediate feedback. The viewer adds an explicit guided sequence rather than adopting a commercial application's full toolbar and property-editor complexity. No third-party screenshots or assets are bundled in the app.

## Interaction decisions

| Previous friction | New behaviour |
| --- | --- |
| No obvious first action | Open a pattern or start an unassembled, guided example |
| Copies, transforms and seams exposed together | Four named steps with prerequisites, progress and a persistent next action |
| Add every copy manually | Review source cut quantities and create the fabric pieces together |
| Mirroring requires prior software knowledge | Explain left/right pairs and provide pair and individual-copy controls |
| Start by entering X/Y/Z values | Named placement buttons, visible drag arrows and directional nudges; numeric fields stay under optional fine-tuning |
| Match edge numbers in a modal dialog | Click two edges in the flat view while keeping the 3D stitch preview visible |
| Unexplained reverse-direction checkbox | Label both ends and offer Swap ends with visible endpoint pairing |
| No check before committing a seam | Preview the pair, compare lengths, then explicitly save it |
| Difficult to recover mistakes | Review/remove saved seams, Undo/Redo, Escape to cancel, and preserve work when revisiting steps |
| Unclear finishing point | Review openings and unjoined pieces, compare before/after, then download with reopening instructions |
| Easy to lose unfinished work | Unsaved status, Save progress, and discard prompts before replacing the workspace |

## Boundaries

The sequence assists the user's decisions; it does not infer intended seams, validate the sewing instructions, introduce a body model or improve the existing cloth solver. Length mismatch may be intentional, so it is explained rather than blocked. Open edges are expected at necklines and hems. Having one seam per piece is not treated as proof of completion.

The flat board supports pointer selection and keyboard activation. Edge dropdowns and movement buttons provide alternatives to canvas interactions. Labels, progress counts and endpoint numbers carry meaning alongside colour. Desktop next actions remain visible while the step content scrolls; smaller screens stack the views and retain the same workflow.

## Validation

Unit tests cover step prerequisites, quantity limits, explicit pair mirroring, preservation of existing placement and seams, seam reuse prevention, endpoint suggestions and undo/redo branching. Browser walkthroughs exercise the novice example from an empty workspace through preparing, arranging, joining, review, downloading and reopening, as well as recovery, existing files and responsive layout. Geometry, fit accuracy and support for additional Seamly construction tools remain separate concerns.
