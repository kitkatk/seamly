# seamly

Base shapes and patterns for sewing pattern design.

## Local 3D pattern viewer

A browser-local Seamly viewer lives in [`viewer/`](viewer/). It includes an orbitable 3D scene, guided garment assembly, two fabric presets, body measurement tables and pattern variable tables. Files are parsed in the browser; nothing is uploaded.

Requires Node.js **20.19+ or 22.12+** and a current WebGL-capable browser.

```sh
cd viewer
npm ci
npm run dev
```

Open the printed local URL (normally **http://127.0.0.1:5173**). For a production build, run `npm run build`, then `npm run preview`. Once dependencies are installed, development and preview work offline.

See [the viewer guide](viewer/README.md) for the assembly workflow, supported Seamly constructs and current limits.
