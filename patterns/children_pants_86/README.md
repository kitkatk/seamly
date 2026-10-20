# Size 86: roomy children's outer trousers

An original, editable base block inspired by the reference's loose pull-on silhouette, for wearing over a diaper and leggings. The waistband and cuffs are folded ribbing, **3 cm finished height**, with cuffs intended at the ankle. Baste a fitting sample in similar fabric and check sitting and squatting before cutting the final fabric.

## Current requested stitching-line dimensions

All dimensions are centimetres. Rise seam lengths follow the centre seam from shell waist to crotch/inseam junction and **exclude the waistband and seam allowance**.

| Dimension | Front piece | Back piece |
|---|---:|---:|
| Seam-walked rise | **18.00** | **23.50** |
| Waist edge, including its slope | **14.50** | **16.50** |
| Horizontal hip width | **16.50** | **18.00** |
| Hem width | **12.80** | **12.80** |
| Main-fabric side seam | **40.00** | **40.00** |
| Inseam, derived to match | **23.97** | **23.97** |
| Straight upper centre | 8.02 | 10.00 |
| Crotch curve alone | 9.98 | 13.50 |

Front and back are each cut as a mirrored pair. These piece dimensions give:

- Full shell waist: **62 cm**, gathered into ribbing.
- Full shell hip: **69 cm**; 14 cm ease over the supplied 55 cm body hip.
- Shell opening per leg: **25.6 cm**, gathered into a cuff.
- Developed side length including both rib bands: **46.00 cm**.
- Front vertical crotch-tip depth from shell side waist: 16.78 cm (19.78 cm including waistband).
- Back crotch-tip depth from the original side-waist datum: 18.56 cm. After shaping, the back side waist is 0.167 cm above that datum, so the depth below the new side waist is 18.73 cm and the centre-back raise above it is 1.83 cm.

The dressed body references remain waist 50, hip 55, side waist-to-floor 41, and vertical crotch-to-floor 25. The last two measurements were taken over diaper and leggings. They remain body references; they do not override the new seam-length targets. There is no second diaper-thickness allowance.

The developed garment length is intentionally longer than the floor-based body reference. Cuffs sit at the ankle and shell fabric blouses above them. Actual blousing also depends on the unmeasured ankle-to-floor distance. Baste at the intended ankle position and check movement and excess length before trimming.

## Open and adjust in Seamly2D

Open `children_pants_86.sm2d` directly using File → Open. No linked `.smis` file is required. The file uses native format 0.7.5 and was tested in Seamly2D v2026.10.12.200.

In the Variables table, edit these primary design inputs:

- `#front_rise_target`, `#back_rise_target`: actual seam-walked shell rise targets.
- `#waist_take_in`: side-only reduction on EACH piece, now 1.5 cm. Increasing it by 0.25 cm removes another 1 cm from the full shell opening.
- `#front_waist_before_take_in`, `#back_waist_before_take_in`: original piece waist lengths, 16 and 18 cm. `#front_waist` / `#back_waist` are the resulting 14.5 / 16.5 cm edges. Leave the original values unchanged when adjusting only the side take-in.
- `#front_width`, `#back_width`: piece hip widths.
- `#hem_width`: width at the hem of **each** piece; `#hem` is the derived full leg opening.
- `#shell_length`: main-fabric side seam excluding both bands.
- `#hip_depth`, `#back_raise`: hip reference level and centre-back waist raise.
- `#band_height`, `#cuff_height`, `#waist_ratio`, `#ankle`, `#cuff_ease`, `#sa`: ribbing and seam allowances.

The new construction uses a calibrated cubic shape scaled by its required arc length. The arc and straight upper-centre lengths therefore sum to the requested rise **inside Seamly2D**, including after editing the rise targets. The default crotch extensions remain 2.75 cm front and 5.5 cm back. Do not edit the `#front_shape_*` / `#back_shape_*` calibration ratios unless changing the construction method.

The waist reduction is taken entirely at the side seams: each of the four waist edges is shortened by 1.5 cm, giving `2 × (14.5 + 16.5) = 62 cm`. The new side waist points lie along the original waist edges and taper to the unchanged hip-side points. The original centre-waist, hip and crotch points, curve handles and rise lengths are preserved. The back waist slopes, so taking 1.5 cm along it also lifts its side endpoint by 0.167 cm.

`#shell_length` still fixes each walked main-fabric side at **40 cm**. The tapered waist-to-hip segments measure 8.1394 cm front and 8.3016 cm back. The lower-leg construction balances the remaining side lengths with matched 23.9696 cm inseams. The front hem is at depth 39.8606 cm from the original datum; the back outer hem is at x −0.6215 cm, depth 39.6923 cm. Both hems remain horizontal and 12.8 cm wide. The lower-leg adjustments keep the seam lengths matched rather than adding circumference.

The geometric hip crossings are construction references, **not matching assembly notches**: they differ by about 1.62 mm in walked distance from the shaped waist. For balance marks, measure the same distance down each side stitching line (for example 12 cm from the waist). Grain remains parallel to the original vertical construction axis; the sewn upper sides now taper. Inspect the allowance at the small hip corner. If smoothing that corner, re-walk the side seams rather than assuming their lengths remain exactly 40 cm.

Editing `#shell_length` adjusts leg length without recalculating the requested rise targets. Always check the resulting outlines: some combinations may give construction circles with no valid intersection, an inverted lower leg, or unsuitable proportions. The selected circle-intersection branch is the nearby lower hem for this baseline; do not assume it remains suitable across arbitrary changes.

The former `#crotch_drop`, `#rise_ease`, and `#leg_ease` controls have been replaced by the explicit seam targets. `#outseam` and `#inseam` are body references, not the garment seam lengths. `#hip_ease` is now calculated from the specified piece hip widths.

You can still adjust crotch spline handles directly, but doing so changes the seam-walked rise; remeasure and recheck after a handle edit. The centre seams slope slightly from the waist to the wider hip. The crotch curves retain the original vertical tangent at their hip endpoint; smooth that small tangent change during fitting if needed, then walk the seam again.

Save your adjusted version under a separate filename. The generator replaces the supplied `.sm2d`; do not regenerate over unsaved direct edits.

## Cut list and ribbing

Seamly2D generates **1 cm seam allowance on every edge** by default. Do not add another allowance.

| Piece | Cut | Fabric / raw dimensions |
|---|---|---|
| Front | 2 mirrored | Main fabric, grain parallel to original vertical construction axis |
| Back | 2 mirrored | Main fabric, grain parallel to original vertical construction axis |
| Waistband | 1 rectangle | Ribbing **49 × 8 cm**, allowances included |
| Cuff | 2 rectangles | Ribbing **20 × 8 cm** each, allowances included |

Rib lengths have not been changed by the shell adjustments: the relaxed waist loop is 47 cm and each cuff loop is 18 cm. The estimated body ankle is 16 cm, with 2 cm positive cuff ease. All rib lengths remain provisional.

Greatest stretch runs along the 49 cm / 20 cm direction. Rib wales run across the 8 cm height. Join short ends into a loop, fold lengthwise at 4 cm from the raw edge, and attach with 1 cm allowance: the visible finished height is 3 cm. These are full rectangles, not pieces cut on the fold. Fold lines are construction lines in Draft mode.

The waist reduction reduces gathering and attachment stretch; ribbing sizes are unchanged:

- Waist: about **31.9%** extension to attach the 47 cm loop to the 62 cm shell waist; at least **17%** just to pass the measured 55 cm body hip, plus comfortable clearance.
- Cuffs: about **42.2%** extension to attach each 18 cm loop to a 25.6 cm shell opening. Check actual heel/foot passage; ankle circumference alone cannot establish this.

Try basted loops on the child. Gather the shell first if firm ribbing cannot stretch enough for even attachment. If a rib loop cannot pass the body part comfortably, increase the loop length; gathering the shell does not solve an undersized opening. Use stretch-compatible stitching and avoid stretching the shell.

## Assembly and fitting

Mark grain, front/back identity, hip reference and rib folds. Sew each front to its corresponding back at the side and inseam. Both sides are 40.00 cm and both inseams are 23.97 cm on the stitching lines. Sew the continuous crotch seam with the legs right sides together. Finish seam allowances to suit the fabric.

Baste bands and check standing, sitting and squatting over the diaper and leggings. Check waist/hip passage, seat coverage, ankle/heel passage and ankle position. Mark matching quarter points, including side-seam positions; front/back waist widths differ. No fly, darts, pockets, elastic casings or reflective bands are included.

## Dimensioned review and validation

View [the annotated PDF](annotated_dimensions.pdf), [PNG](annotated_dimensions.png), or [SVG](annotated_dimensions.svg). Shell dimensions are stitching-line lengths excluding allowances. Rib CUT dimensions include allowances. [seam_lengths.json](seam_lengths.json) and [dimensions.json](dimensions.json) contain evaluated values.

The front rise is 8.01561 cm straight plus 9.98439 cm curved; back is 10.00062 cm straight plus 13.49938 cm curved. Curve lengths are integrated along the cubic Bezier with convergence checked. The full front-to-back shell crotch seam is **41.5 cm**, excluding ribbing. These are not vertical body heights.

The checker verifies all requested waist/rise/hip/hem targets from the actual native geometry, equal side and inseams, object references and seam allowances. The updated XML passed the official v0.7.5 schema and native Seamly2D load/export. Physical fit remains to be tested.

Review sheets are static snapshots, not cutting layouts. Regenerate after editing using `scripts/annotate_pattern.py`; see the root README. For cutting, create a Seamly2D layout at **100% scale** and verify a known dimension before cutting. The native previews are separate from the annotated review sheets.
