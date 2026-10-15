# seamly
Base shapes and patterns for sewing pattern design.

## Children's outer trousers — size 86

Open [the editable Seamly2D pattern](patterns/children_pants_86/children_pants_86.sm2d) with **File → Open** in Seamly2D. This is a native formula-driven `.sm2d` file, not an SVG tracing. No separate measurements file is required. See the [pattern instructions](patterns/children_pants_86/README.md) before cutting.

- [SVG preview](patterns/children_pants_86/preview.svg)
- [Calculated dimensions](patterns/children_pants_86/dimensions.json)

### Development

Python 3.12 was used; Python 3.10+ is sufficient.

```sh
cd /workspace/seamly
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/check_pattern.py
```

The only Python dependency is `lxml`, pinned in `requirements.txt`. Generation uses the standard library. **Regeneration replaces the supplied pattern and discards any direct Seamly2D edits to that file**; save your adjusted version under a different filename first.

```sh
.venv/bin/python scripts/draft_pants.py
.venv/bin/python scripts/check_pattern.py
```

Edit `VARIABLES` in the generator for a regenerated baseline, or use Seamly2D's Variables table for interactive changes. The checker evaluates the generated file itself and checks hip ease, side length, matching inseams, object references, and seam allowances. It writes `dimensions.json`. Optionally validate the native XML against the upstream `src/libs/ifc/schema/pattern/v0.7.5.xsd` with `--schema PATH`.

Native load and SVG/PNG exports were also verified using the official Seamly2D Linux release **v2026.10.12.200**, with Xvfb for headless operation. Seamly2D is a desktop application, not a pip dependency; obtain desktop releases from https://github.com/FashionFreedom/Seamly2D/releases. No web server is needed.
