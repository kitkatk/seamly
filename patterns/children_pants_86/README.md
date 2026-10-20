# Size 86 — barrel-inspired softshell overtrousers

This is an **original whole-leg redraft** for a child wearing a diaper and leggings. The prior pattern concentrated shaping at the upper hip and left most of the leg straight. This version carries a broad bow through the thigh/upper-knee region and tapers gradually to the ankle, with curved inseams as well as curved outseams.

It is a fitting draft, not a professionally fitted commercial block. Baste a sample in material with similar weight and stiffness. The previously cut straight-leg pieces are **not guaranteed to contain this new outline**; overlay the patterns before considering reuse. Some regions need additional fabric.

## What changed

- The full outseam is two native cubic Beziers joined with a common vertical tangent at the broad barrel station. There is no straight lower outseam or isolated waist-to-hip scoop.
- The side moves gradually outward from the waist to 2 cm beyond the side-waist axis around 22.10 cm down the shell, then returns inward to the ankle. The bow depth is a design choice, not a body measurement.
- Front and back use **identical side curves**, so their whole side lengths, upper/lower sections and barrel balance stations match.
- Both inseams are curved, retaining thigh volume and tapering toward the cuff. The inseams and side seams enter the horizontal hem at 90°.
- The back waist is now a shallow curve, rather than a sloping straight segment. Its side tangent is horizontal, meeting the vertical side tangent at 90° without the previous small outward waist bump.
- The centre seams now curve smoothly through the hip reference instead of joining a sloping straight segment to a vertical crotch tangent. Their waist tangents are vertical, squaring both centre-waist joins as well.
- The centre-back raise is solved to about 2.36 cm to match the curved inseams while retaining the 23.5 cm back rise seam. Other centre-waist and crotch coordinates have changed to accommodate the new shape.

## Current stitching-line dimensions

All dimensions are centimetres. Shell values exclude the 1 cm seam allowance and the separate ribbing.

| Dimension | Front | Back |
|---|---:|---:|
| Waist edge | 14.50, straight | 16.50, curved |
| Hip width at reference level | 16.50 | 18.00 |
| Centre rise, seam-walked | 18.00 | 23.50 |
| Full curved side seam | 40.00 | 40.00 |
| Curved inseam | 23.38 | 23.38 |
| Hem width | 12.80 | 12.80 |
| Waist/side intersection | 90° | 90° |
| Side/hem and inseam/hem intersections | 90° | 90° |

- Full shell waist: **62 cm**.
- Full shell hip: **69 cm**, including 14 cm ease over the supplied 55 cm dressed hip reference.
- Shell opening per leg: **25.6 cm**.
- Developed side length including 3 cm waistband and 3 cm cuff: **46 cm**.
- Shell vertical height: **39.47 cm**; curved seam length and vertical height are different quantities.
- Generous barrel-station circumference per leg: **42.09 cm**, at approximately **22.10 cm** shell depth. The leg narrows progressively below this station. This is not a measured or standardized child knee circumference.
- Centre-back waist raise: **2.36 cm**, a solved pattern adjustment, not a new body measurement.

Original dressed body references remain waist 50, hip 55, waist-to-floor 41 and vertical crotch-to-floor 25. These do not override the garment design targets. No extra diaper thickness is assumed beyond the dressed measurements and specified ease. The cuffs should sit at the ankle; baste their position and check sitting, squatting, heel passage and excess blousing.

## Open and adjust in Seamly2D

Open `children_pants_86.sm2d` using File → Open. It is a self-contained native format 0.7.5 file with all four pieces and seam allowances. No `.smis` file is needed. Native load and SVG/PNG exports were tested with Seamly2D v2026.10.12.200.

The point construction, native Bezier handles and solved coordinates are editable in Seamly2D. The first Variables rows describe the design targets; later rows contain solved results and point coordinates.

**Editing a target variable does not rerun the numerical fitting solver.** To rebalance the exact lengths and angles after a design change, edit `DESIGN` in `scripts/draft_pants.py`, regenerate, and run the checker and annotator. Generation replaces the supplied native file; save a separately edited copy first.

Useful generator inputs include `barrel_bow`, `barrel_level`, `hem_shift`, shell side length, front/back waist and hip widths, rise targets and hem width. The solver fits full side arc length, waist-curve length, rise lengths and matching curved inseams. Extreme combinations may be impossible or may give unsuitable shapes; do not treat this as validated grading across sizes.

For inspection in Seamly2D, hover over a line or curve for its length, or use Measurements → Variables table → Line lengths / Curve lengths. For a complete side, sum `Spl_FSideWaist_FBarrel + Spl_FBarrel_FOuterHem` (replace `F` with `B` for the back). Inseams are now `Spl_FCrotch_FInnerHem` and `Spl_BCrotch_BInnerHem`. The back waist is `Spl_BSideWaist_BWaist`.

## Cut list and assembly

| Piece | Quantity | Material |
|---|---|---|
| Front barrel | 2 mirrored | Winter softshell; vertical grain |
| Back barrel | 2 mirrored | Winter softshell; vertical grain |
| Waist rib | 1 rectangle, **49 × 8 cm raw** | Ribbing, stretch along the 49 cm direction |
| Cuff rib | 2 rectangles, **20 × 8 cm raw** each | Ribbing, stretch along the 20 cm direction |

The native pieces include **1 cm seam allowance on every edge**. Do not add another allowance. Rib raw dimensions include those allowances. Join each rectangle's short ends, fold lengthwise in half, and attach with 1 cm allowance for a 3 cm finished band. The relaxed finished waist loop remains **47 cm**, each cuff loop **18 cm**. These sizes remain provisional; the ribbing was not shortened with the shell.

At the waist, attaching the 47 cm loop evenly to the 62 cm shell requires approximately **31.9% extension**. At each cuff, attaching an 18 cm loop to the 25.6 cm shell requires about **42.2% extension**. Verify comfortable hip/heel passage and recovery on the child. Gather the shell first if needed for attachment; do not stretch the softshell itself.

Mark the barrel station on both side seams; these stations match because the side curves are identical. Mark any additional assembly balance points by matching **walked seam distance**, especially on the differently shaped inseams. Sew front to back at side and inseam, then sew the continuous crotch seam. Baste bands before final finishing and test movement over the diaper and leggings. There are no knee darts, extra panels, pockets, fly or reflective bands in this version.

## Review sheets and validation

- [Dimensioned PDF](annotated_dimensions.pdf)
- [Dimensioned PNG](annotated_dimensions.png)
- [Dimensioned SVG](annotated_dimensions.svg)
- [Seam lengths](seam_lengths.json) and [sizing checks](dimensions.json)

Dimension arrows connect endpoints; curved-edge labels report the walked curve lengths, not those chords. The annotation reads the actual native XML and integrates the curves; it does not estimate curves from straight endpoint distances. The checker verifies targets, matching sides and inseams, the shared side shape, square waist/hem corners, tangent continuity, hip reference placement, knee-to-hem taper, non-crossing leg edges and valid model references. The file passed the official v0.7.5 XML schema and native load/export.

Review sheets are static sizing snapshots, **not cutting layouts**. Regenerate them after native edits. Produce a Seamly2D cutting layout at 100% scale and check a known dimension before cutting.

## Research access and provenance

The requested fresh sewing-site research could **not** be completed in this cloud session: direct requests to the Sew Liberated Arthur Pants page and Style Arc Bob Woven Pant page returned proxy `403 Forbidden`. No descriptions or commercial pattern drawings from those pages were used as verified evidence, traced or copied. The current shape is an original barrel-inspired redraft based on the stated silhouette and independent drafting judgment.

The blocked candidate references were:

- https://sewliberated.com/products/arthur-pants-digital-sewing-pattern
- https://www.stylearc.com/shop/sewing-patterns/bob-woven-pant/

Domain additions for these sites and `blog.megannielsen.com` were saved as an environment configuration draft. They require review/save in environment settings and publication to become reusable; saving the draft alone does not establish access. A reference check remains outstanding until access is available. The draft's geometric validation should not be confused with external construction research or physical fit validation.
