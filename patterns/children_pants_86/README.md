# Size 86 — softshell overtrousers with rib bands

This revision starts from **`2a2e18f`**, restoring its straight lower-leg and centre-rise construction. It reduces the waist by **1.5 cm of stitching-line length on each of the four shell pieces**: front 16 → 14.5 cm, back 18 → 16.5 cm. The total shell opening is **62 cm**. The child wears a diaper and leggings underneath.

## Shape and assembly

The side-waist positions move inward while the original hip references stay fixed. Each upper side is a smooth concave Bezier curve: it moves outward toward the hip, then blends tangentially into the straight lower side. There is no inflection or extra side bump. The centre-waist points, hip reference points, crotch tips and crotch-curve controls are unchanged from `2a2e18f`.

The back retains its sloping straight waist. Its waist/side corner is **109.97°**. The front waist has a broad shallow truing curve, with a **70.03°** corner, so the two waist tangents form a continuous line when the side tangents are aligned as sewn. Making both corners obtuse with this particular geometry would leave a kink at the joined waist. These complementary angles are a solution for this draft, not universal drafting rules. See [the joined-waist close-up](waist_join.png).

The front blend dips at most **0.64 cm** below its endpoint level. Its minimum radius is approximately **1.70 cm**, allowing a regular 1 cm offset seam allowance. The side-waist point moves horizontally about 1.63 cm at the front, rather than exactly 1.5 cm, because the reduction is measured along the curved waist. The reduction in edge length is still exactly 1.5 cm per piece.

The hem coordinates are rebalanced to keep both walked side seams at 40 cm and both straight inseams equal. Hip and hem widths remain unchanged. No darts or new panels are added.

## Stitching-line dimensions

All dimensions are centimetres, excluding seam allowance and separate ribbing.

| Dimension | Front | Back |
|---|---:|---:|
| Waist edge | 14.50, curved | 16.50, straight/sloping |
| Hip width at reference level | 16.50 | 18.00 |
| Centre rise, seam-walked | 18.00 | 23.50 |
| Complete side seam | 40.00 | 40.00 |
| Straight inseam | 23.932 | 23.932 |
| Hem width | 12.80 | 12.80 |
| Waist/side interior angle | 70.03° | 109.97° |

The full shell hip remains **69 cm**, providing 14 cm ease over the supplied dressed hip of 55 cm. The 62 cm waist opening provides 7 cm clearance over that hip reference. The opening per leg is **25.6 cm**. Developed side length including the 3 cm waistband and 3 cm cuff is **46 cm**; this is fabric length, with excess intended to blouse above the ankle cuffs.

Body references remain waist 50, dressed hip 55, waistband-to-bare-floor 41 and vertical crotch-to-floor 25. Centre rise seam length is different from vertical crotch depth. Check standing, sitting and squatting over the intended layers before final finishing.

## Open and adjust in Seamly2D

Open `children_pants_86.sm2d` using File → Open. It is a self-contained native format 0.7.5 file, with four pieces and seam allowances. No measurement file is required.

The construction points and native Bezier handles are editable. The first Variables rows describe inputs; later rows include calibrated values. **Changing an input in Seamly2D does not rerun the Python numerical solver.** For a rebalanced generated version, edit the input rows of `VARIABLES` in `scripts/draft_pants.py`, regenerate, check and annotate. Generation replaces the supplied native file; preserve any separately edited copy first. The current calibration is for this size and these targets, not a validated grading system.

For curve measurements, use the curve's actual name from Seamly2D's available variable list after that curve has been constructed. A point formula cannot reference a curve constructed later. This is why the curve list can be empty while editing an early point. This file also contains custom variables describing construction lengths; the dimension sheets read and measure the actual native geometry.

## Cutting and sewing

| Piece | Quantity | Material |
|---|---|---|
| Front | 2 mirrored | Winter softshell; vertical grain |
| Back | 2 mirrored | Winter softshell; vertical grain |
| Waist rib | 1 rectangle, **49 × 8 cm raw** | Stretch along 49 cm direction |
| Cuff rib | 2 rectangles, **20 × 8 cm raw** each | Stretch along 20 cm direction |

The native pieces include **1 cm seam allowance on every edge**. Do not add it again. Rib dimensions include allowance: join short ends with 1 cm seams, fold lengthwise and attach with 1 cm allowance for a 3 cm finished band. Relaxed finished loops remain **47 cm at the waist** and **18 cm at each cuff**. The ribbing dimensions are unchanged and remain provisional.

Attaching the 47 cm waist loop to the 62 cm shell requires approximately **31.9% extension**; attaching an 18 cm cuff to a 25.6 cm leg opening requires **42.2% extension**. Distribute the gathering evenly; avoid stretching the softshell itself. Check hip and heel passage with the actual ribbing.

Use common **walked seam distances** from the waist for side balance marks. The front and back hip construction points occur at slightly different walked distances (8.179 and 8.313 cm), so they are not matching sewing notches. Sew front to back at sides and inseams, then sew the continuous crotch seam. Baste the rib bands and check mobility and ankle position. There are no pockets, fly, knee darts or reflective strips in this draft.

For pieces already cut from the original 68 cm version, overlay the new stitching and cutting lines before trimming. The front waist blend lowers the edge locally; take-in and any lower-leg rebalancing should be checked on the actual pieces.

## Review and validation

- [Dimensioned PDF](annotated_dimensions.pdf), [PNG](annotated_dimensions.png), [SVG](annotated_dimensions.svg)
- [Joined waist PDF](waist_join.pdf), [PNG](waist_join.png), [SVG](waist_join.svg)
- [Native cutting-line preview](preview.svg)
- [Measured seam lengths](seam_lengths.json) and [sizing checks](dimensions.json)

Curved-edge labels report walked lengths; the dimension arrows connect endpoints. These are review snapshots, not print-to-cut layouts. Export a cutting layout from Seamly2D at 100% and check a known dimension.

The checker verifies native references, target dimensions, matching side and inseam lengths, tangent continuity into the lower sides, absence of side inflections, joined waist tangency, and the front-waist radius relative to seam allowance. The file passes the official v0.7.5 XML schema and native load plus SVG/PNG export in Seamly2D v2026.10.12.200. The native allowance outline was also reviewed. These checks validate drafting geometry; a physical fitting sample is still needed for fit.

## Construction reference

An accessible open-source example is FreeSewing **Paco**, woven pants with an elasticated waist and cuffs. Its construction adapts the waist for passage over the seat, deducts the separate waistband depth, and balances front/back seam lengths after shaping. Those are the principles used here; no source code or pattern outlines were copied. Paco is an adult design, not a children's winter-softshell sizing standard, and it does not prescribe the particular angles or ease used in this draft.

Verified source snapshot: [`8a8de5a`](https://github.com/freesewing/freesewing/tree/8a8de5a271d9823bb393735a41dd3993cf5bcf4b).

- [Paco front construction](https://github.com/freesewing/freesewing/blob/8a8de5a271d9823bb393735a41dd3993cf5bcf4b/designs/paco/src/front.mjs)
- [Paco back construction](https://github.com/freesewing/freesewing/blob/8a8de5a271d9823bb393735a41dd3993cf5bcf4b/designs/paco/src/back.mjs)
- [Paco introduction](https://github.com/freesewing/freesewing/blob/8a8de5a271d9823bb393735a41dd3993cf5bcf4b/markdown/org/blog/meet-paco/en.md)

The user's observation about *Building the Pattern* informed the request; the book itself was not accessed. Commercial sewing-site requests were blocked by the cloud proxy, so those pages are not claimed as verified references. No single industry-standard waist/side angle or softshell ease value is asserted here.
