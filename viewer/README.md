# Seamly Pattern Studio

A locally run 3D viewer for Seamly `.sm2d` patterns. All pattern, measurement and assembly files stay in browser memory. Refreshing clears the workspace; save your assembly setup before closing it.

## Run

Requires Node.js 20.19+ or 22.12+ and a current browser with WebGL enabled.

```sh
npm ci
npm run dev
```

Open the printed loopback URL, normally http://127.0.0.1:5173. The server binds to the local machine. There are no runtime CDNs, accounts, APIs or uploads.

```sh
npm test          # parser, measurement, formula and assembly tests
npm run build    # TypeScript check and production bundle
npm run preview  # serve the production bundle locally
```

## Assemble a pattern for the first time

Choose **Open a .sm2d pattern**, or **Try the guided example** if you want to learn with a simple sleeveless top. The example now starts unassembled and explains each step. It includes synthetic body measurements and is not a production sewing pattern.

The four steps stay visible across the top. Each step explains the current task and has a next action at the bottom of its panel. You can revisit completed steps without starting again.

### 1. Prepare pieces

Check the number of fabric pieces to cut from each pattern template. The suggested quantities come from the pattern. Choose **Make mirrored left/right pairs** when your cutting instructions require opposite copies, then **Create fabric pieces**. You can also mirror individual pieces in the next step.

Changing quantities later retains the identities, positions and seams of copies that remain. Removing a copy also removes its seams; Undo can restore it. Quantity changes must be applied with **Update pieces & continue** before moving on.

For on-fold pieces, create two copies, mirror one, and join the fold edges. Automatic fold expansion is not implemented.

If no outlines can be imported, the step explains how to load referenced measurements or review the import notices under **Pattern details, fabric & measurements**. Unsupported construction tools are still reported; this UX update does not extend the drafting engine.

### 2. Arrange in 3D

Select a fabric piece from the list, the flat view, or the 3D view. Choose **Front**, **Back**, **Left side**, **Right side** or **Keep flat** to give it a starting position. These are approximate positions around the garment centre, not automatic placement on an avatar. The front is nearest the camera in **Front** view; left and right refer to that view.

Drag the coloured arrows in 3D to move the selected piece, or use the directional buttons for 2 cm steps. **Curve around the garment** bends the piece before joining. **Fine-tune position & rotation** contains names, numeric millimetre positions and degree rotations; it is optional. You can also choose **Use the current position** to confirm a custom arrangement.

The checklist tracks which pieces have a starting position. Choose **Position next piece** until every piece is positioned, then **Continue to join edges**. In the example, put Front at the front and Back at the back.

### 3. Join edges

Keep the flat outlines and 3D view side by side:

1. Click a flat outline edge to select side **A**.
2. Click its matching edge to select side **B**. Keyboard users can focus an edge and press Enter or Space; an edge-list alternative is also available.
3. Check the displayed lengths and the numbered ends **A1/A2** and **B1/B2**. The 3D stitch lines preview the match. **Swap ends** changes which endpoints meet. A length warning helps spot a mismatch but permits intentional easing or gathering.
4. Choose **Save this seam**, then repeat for the next pair. The primary action stays visible at the bottom of the step panel.

The example's **Show me these two edges** selects the next side or shoulder seam for you to inspect and save; it never saves a seam automatically. Leave necklines, armholes, hems and other openings unjoined.

Joined edges share a colour. Click one or choose a seam in **Saved seams** to review it, swap its ends or remove it. Each edge can belong to one seam. Different edges of the same fabric piece may be joined to make a tube. Escape cancels a pending selection. Undo/Redo, including Command/Ctrl Z and Command/Ctrl Shift Z, recover assembly edits.

### 4. Preview & save

**Preview joined shape** closes the supplied seams. Look around the garment; **Show before joining** compares it with the starting arrangement. The review identifies pieces with no seams and counts edges left open, so you can check whether those openings are intentional. It does not assume that every edge should be sewn or declare a garment complete just because every piece has a seam.

Return to **Join edges** for a twisted seam, or **Arrange in 3D** for a misplaced piece. **How accurate is this preview?** explains the geometry limits and shows the mean seam gap.

Choose **Download assembly** to keep your work as a `.assembly.json` file. **Save progress** also works during earlier steps; finish or cancel any pending edge selection first. Keep this file with the original `.sm2d` and any `.smis` measurements. To continue later, reopen the pattern, load its measurements if needed, then choose **Open saved assembly**. The appropriate step is selected automatically. Existing version-1 assembly files remain compatible.

There is no automatic persistence. The app displays unsaved changes and asks before discarding an unsaved assembly when opening another pattern or saved setup. Downloading a setup starts a browser download; make sure to keep the downloaded file.

See [the UX rationale and research references](docs/assembly-ux.md) for the interaction choices behind the guided flow.

## Measurements and drafting variables

- Embedded `<body-measurements><m .../></body-measurements>` and `<measurements><m .../></measurements>` populate the **Body measurements** table automatically. Embedded body measurements take priority over an external file.
- Otherwise select an individual `.smis` file. Measurement names, values, units and formula/description text appear in the table. Derived measurements are evaluated in dependency order. Missing inputs and circular dependencies appear as **Unresolved**, with the reason, rather than a fabricated number.
- A `.sm2d` `<measurements>` path is a reference, not embedded measurement data.
- `<variables><variable .../></variables>` appear separately in **Pattern variables**. Custom inputs can mix body sizes, ease, allowances and calculations, so the viewer does not classify all variables as body measurements. For example, the local `pants86-final` sample keeps its waist and hip inputs here.
- Millimetres, centimetres and inches are supported. Geometry uses millimetres internally. Body tables retain the measurement file's original units.
- External measurements can be removed. Loading a new pattern clears the previous external measurements and assembly to avoid carrying a person's values into another draft.

## Fabric presets

| Preset | Illustrative weight | Thickness | Stretch description |
| --- | --- | --- | --- |
| Mid-weight cotton weave | 180 g/m² | 0.45 mm | Low |
| Winter softshell | 320 g/m² | 2.5 mm | Slight |

The selection changes colour, procedural surface texture, roughness, rendered thickness and the seam preview's length-constraint stiffness. These are illustrative defaults, not supplier specifications. Weight and stretch descriptions are shown for reference; this version does not calculate gravity, anisotropic stretch, bending mechanics or validated drape from them.

## Format support and limits

This version reads XML directly, without needing Seamly2D installed. It supports:

- `draftBlock`/`draw` calculation and modeling references; `piece`/legacy `detail` outline nodes, node reversal and excluded nodes;
- points: `single`, `endLine`, `alongLine`, `midPoint`, `normal`, `pointOfIntersection`, `lineIntersect`;
- `simpleInteractive` cubic splines and `simple` circular arcs, sampled along their outlines;
- named variables (`#...`) and measurements (`@...` or ordinary names); arithmetic `+ - * / ^`, parentheses, degree-based trigonometry, `sqrt`, `abs`, `min`, `max`, `floor`, `ceil`, `round` and `pi`.

Other point/curve tools, spline paths, elliptical arcs, Seamly geometry-derived formula functions, internal paths, darts, notches, automatic seam-allowance offsets and pattern grading are not implemented. Import notices identify missing or unsupported dependencies. This is partial Seamly format support; it is not the full native drafting engine.

Piece outlines are triangulated and subdivided into meshes. User-defined seams are relaxed using position-based seam and edge-length constraints. Curvature and placement provide the initial shape. There is no avatar, body collision, self-collision, gravity or calibrated cloth simulation; wrong placements or incompatible seam lengths can create intersections and distortions. Mean seam gap reports closing error, not fit accuracy. Unequal seam lengths are paired by relative arc length for a rough gathering/easing preview. Use seam-line outlines; allowances are not removed automatically.

Limits: 10 MB per input file, 40 placed copies and 100 seam connections. Assembly loading validates piece IDs, finite transforms and single use of edges. XML DTD/entity declarations are rejected. Pattern formulas use a constrained arithmetic parser, never JavaScript evaluation.
