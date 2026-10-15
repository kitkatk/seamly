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

## Load a pattern and assemble it

1. Open or drop a `.sm2d` file. The **Pieces** view shows the source outlines and import notices. Unsupported constructions are reported and affected pieces are omitted.
2. If the pattern references external body measurements, load the corresponding `.smis` file. Geometry is recalculated using those values, with unit conversion. The referenced path is shown as a hint; browsers cannot read another local file without the user selecting it.
3. Use **Add a cut copy** for each physical panel. The source's cut quantity is shown as a guide. Copies are added explicitly: a quantity does not specify which copies need mirroring. Mark **Mirror pattern horizontally** where needed. For on-fold pieces, create a mirrored copy and join the fold edges; automatic fold expansion is not implemented.
4. Set each copy's **position** in millimetres and **rotation** in degrees. Y points up; positive Z faces the initial camera. Use **Initial curvature** to wrap panels around the body before joining their edges. Select a copy in the list or the canvas to see its numbered edges. Use **Assembly** to inspect placements and **Pieces** for source shapes.
5. Choose **Add** under Seam connections, then select the two sewn edges. Reverse the second edge when the endpoints should match in the opposite order. Orange connector lines show the pairing before sewing. Each edge can belong to one seam; self-seams between different edges of the same copy are allowed.
6. Choose **Preview sewn shape** to close the supplied seams. **Edit placements** returns to the initial layout. Unconnected edges remain open. The mean seam gap is displayed to help identify poorly converged connections.
7. **Save setup** downloads a `.assembly.json` containing cut copies, mirroring, placement and seams. Reopen the original pattern, load its measurements if needed, then **Load setup** to reuse it. Assembly IDs must match the pattern's piece IDs. There is no automatic persistence.

The included **Explore the example** loads a synthetic sleeveless-shell pattern with its assembly supplied. Its body measurements are demonstration values, not a production size specification.

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
