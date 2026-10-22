# seamly

Original editable sewing-pattern drafts.

## Size-86 children's softshell overtrousers

Open [children_pants_86.sm2d](patterns/children_pants_86/children_pants_86.sm2d) directly in Seamly2D. This revision restores the straight lower-leg construction from `2a2e18f`, reduces the shell waist from 68 to **62 cm**, and blends the reduced waist into the unchanged hip with smooth concave side curves. It retains the 69 cm hip, 40 cm walked sides, 18/23.5 cm front/back rise seams and separate 3 cm rib bands.

- [Dimensioned review PDF](patterns/children_pants_86/annotated_dimensions.pdf)
- [Dimensioned review PNG](patterns/children_pants_86/annotated_dimensions.png)
- [Joined-waist close-up](patterns/children_pants_86/waist_join.png)
- [Native SVG preview with seam allowances](patterns/children_pants_86/preview.svg)
- [Construction, dimensions and reference notes](patterns/children_pants_86/README.md)

## Development

Python 3.10+; tested with 3.12. Python dependencies are in `requirements.txt`. CairoSVG also requires system Cairo (`libcairo2` on Debian/Ubuntu or `brew install cairo` on macOS).

```sh
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/check_pattern.py
.venv/bin/python scripts/annotate_pattern.py
```

To change the constrained design, edit the input rows in `VARIABLES` in `scripts/draft_pants.py`, then run:

```sh
.venv/bin/python scripts/draft_pants.py
.venv/bin/python scripts/check_pattern.py
.venv/bin/python scripts/annotate_pattern.py
```

The generator replaces the native file. Save a separately edited native pattern first. Some calibrated values are numerical solver outputs: changing a target variable in Seamly2D does not rerun the Python solver. Native points and handles remain editable; recheck affected seam lengths and joins after edits. This is a single-size fitting draft, not an automatic grading system.

For a local edited copy:

```sh
.venv/bin/python scripts/annotate_pattern.py --pattern /path/to/children_pants_86.sm2d --output /path/to/review
```

The annotator supports this draft's centimetre-based `endLine` points and `simpleInteractive` Beziers. It writes SVG, PNG, PDF and seam-length JSON. These are review snapshots, not cutting layouts. Schema validation is available with `scripts/check_pattern.py --schema PATH_TO_OFFICIAL_v0.7.5.xsd`.

Native validation used official Seamly2D v2026.10.12.200 and Xvfb for headless exports. Desktop releases: https://github.com/FashionFreedom/Seamly2D/releases.
