# seamly

Original editable sewing-pattern drafts.

## Size-86 barrel-inspired children's overtrousers

Open [children_pants_86.sm2d](patterns/children_pants_86/children_pants_86.sm2d) directly in Seamly2D. This revision redrafts the whole leg with broadly bowed side seams and curved inseams, rather than the previous waist-only scoop. It keeps a 62 cm shell waist, 69 cm hip, 40 cm curved sides, 18/23.5 cm front/back rise seams and separate 3 cm rib bands.

- [Dimensioned review PDF](patterns/children_pants_86/annotated_dimensions.pdf)
- [Dimensioned review PNG](patterns/children_pants_86/annotated_dimensions.png)
- [Native SVG preview](patterns/children_pants_86/preview.svg)
- [Construction, fitting and research-access notes](patterns/children_pants_86/README.md)

This is an original fitting draft. Fresh commercial sewing-site research remains blocked by the cloud network policy; see the pattern notes for the attempted references. The earlier cut pieces may not accommodate the new outline.

## Development

Python 3.10+; tested with 3.12. Python dependencies are in `requirements.txt`. CairoSVG also requires system Cairo (`libcairo2` on Debian/Ubuntu or `brew install cairo` on macOS).

```sh
cd /workspace/seamly
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/check_pattern.py
.venv/bin/python scripts/annotate_pattern.py
```

To change the constrained design, edit `DESIGN` in `scripts/draft_pants.py`, then run:

```sh
.venv/bin/python scripts/draft_pants.py
.venv/bin/python scripts/check_pattern.py
.venv/bin/python scripts/annotate_pattern.py
```

**The generator replaces the native file.** Save a separately edited native pattern first. Changing a target variable in Seamly2D does not rerun the numerical solver; native points and handles remain editable, but recheck every affected seam and angle.

For a local edited copy, the annotator supports:

```sh
.venv/bin/python scripts/annotate_pattern.py --pattern /path/to/children_pants_86.sm2d --output /path/to/review
```

The annotation supports this draft's centimetre-based `endLine` points and `simpleInteractive` Beziers. It writes SVG, PNG, PDF and seam-length JSON. These are review snapshots, not cutting layouts. Schema validation is available with `scripts/check_pattern.py --schema PATH_TO_OFFICIAL_v0.7.5.xsd`.

Native validation used official Seamly2D v2026.10.12.200 and Xvfb for headless exports. No web server is needed. Desktop releases: https://github.com/FashionFreedom/Seamly2D/releases.
