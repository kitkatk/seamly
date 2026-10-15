import './style.css';
import { parseMeasurements, parsePattern, type Measurements, type Pattern, type Measurement } from './pattern';
import { fabrics, type FabricId } from './fabrics';
import { PatternScene } from './scene';
import { createInstance, emptyAssembly, validateAssembly, type Assembly, type EdgeRef, type Placement } from './assembly';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const number = (value?: number) => value === undefined ? 'Unresolved' : new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value);
let source = '', filename = '', pattern: Pattern | undefined, external: Measurements | undefined;
let assembly = emptyAssembly(), selected = '', fabric: FabricId = 'cotton', mode: 'assembly' | 'pieces' = 'assembly';
let sewn = false, showEdges = true, tableTab: 'body' | 'variables' = 'body';
let scene: PatternScene | undefined;

$('#app').innerHTML = `
<header class="header"><a class="brand" href="/" aria-label="Seamly Pattern Studio"><span class="brand-icon">s</span><b>seamly<span> / pattern studio</span></b></a><div class="header-right"><span class="local-dot"></span> Local workspace <span class="version">PREVIEW 0.1</span></div></header>
<div class="workspace">
<aside class="sidebar">
 <div class="sidebar-heading"><span class="eyebrow">THE WORKSPACE</span><h1>From pattern<br> to perspective.</h1><p>A little dimension for your next make.</p></div>
 <section><div class="section-title"><span>01</span><h2>Pattern</h2></div><label class="upload" id="drop-zone"><input id="pattern-file" type="file" accept=".sm2d,.val" hidden><span class="upload-icon">↗</span><strong>Open a pattern</strong><small>Choose or drop a .sm2d file</small></label><div id="pattern-info"></div></section>
 <section><div class="section-title"><span>02</span><h2>Fabric</h2></div><div id="fabrics"></div><p class="footnote">Illustrative presets. Actual properties vary by supplier.</p></section>
 <section><div class="section-title"><span>03</span><h2>Measurements</h2></div><div id="measurement-info"></div><label class="button secondary full"><input id="measurement-file" type="file" accept=".smis,.vit" hidden>＋ Load .smis measurements</label><button id="clear-measurements" class="text-button" hidden>Remove external measurements</button></section>
 <div class="sidebar-bottom"><span class="privacy-icon">◉</span><p>Files stay in this browser.<br>No account. No uploads.</p></div>
</aside>
<main class="main">
 <div class="view-header"><div><span class="eyebrow">3D WORKSPACE</span><h2 id="view-title">Your pattern, in a new light.</h2></div><div class="segmented" aria-label="View mode"><button id="assembly-mode" class="active">Assembly</button><button id="pieces-mode">Pieces</button></div></div>
 <div id="notification" role="status" aria-live="polite" hidden></div>
 <div class="stage-row"><div class="stage"><div id="viewport"></div><div class="stage-top"><span id="scene-badge" class="badge">READY WHEN YOU ARE</span><button id="fit" class="tool-button" title="Fit pattern to view">⌖ Fit view</button></div><div id="empty-state" class="empty-state"><div class="empty-mark">◇</div><h2>Every make starts with a pattern.</h2><p>Open your Seamly file, then provide the placements<br>and seam connections to assemble it.</p><button id="load-demo" class="button primary">Explore the example <span>↗</span></button><small>A sleeveless shell with assembly supplied</small></div><div class="stage-bottom"><span>Drag to orbit <i>·</i> Scroll to zoom <i>·</i> Right-drag to pan</span><div class="view-buttons"><button data-camera="front">Front</button><button data-camera="back">Back</button><button data-camera="top">Top</button></div></div></div>
 <aside class="inspector" id="inspector"><div class="inspector-title"><span class="eyebrow">GARMENT ASSEMBLY</span><span class="tiny-tag">MANUAL SETUP</span></div><div id="assembly-content"></div></aside></div>
 <div class="scene-footer"><label><input id="show-edges" type="checkbox" checked> Show edges</label><span id="scene-stats">No pattern loaded</span><span class="preview-note">Geometric preview · no fit simulation</span></div>
 <section class="data-panel"><div class="data-header"><div class="data-tabs"><button id="body-tab" class="active">Body measurements <span id="body-count">0</span></button><button id="variables-tab">Pattern variables <span id="variable-count">0</span></button></div><span id="table-source"></span></div><div id="table-content" class="table-scroll"></div></section>
</main></div>
<input id="assembly-file" type="file" accept=".json" hidden>
<dialog id="seam-dialog"><form id="seam-form"><div class="dialog-heading"><h2>Connect two edges</h2><button type="button" id="close-seam" class="tool-button" aria-label="Close">×</button></div><p>Select the edges that are sewn together. Edge numbers appear when a piece is selected.</p><label>First edge<select id="seam-a" required></select></label><label>Second edge<select id="seam-b" required></select></label><label class="checkbox-label"><input id="seam-reverse" type="checkbox" checked> Reverse the second edge direction</label><p class="footnote">Connect seam lines. Cut edges with seam allowances will not give the same dimensions. Unequal lengths are eased together in the preview.</p><p id="seam-error" class="error" role="alert"></p><button class="button primary full" type="submit">Add seam connection</button></form></dialog>`;
try { scene = new PatternScene($('#viewport'), id => { selected = id; renderAssembly(); renderScene(); }); }
catch { notify('3D rendering is unavailable. Enable WebGL in a current browser. Measurement tables and assembly setup remain available.', true); }

function notify(message: string, error = false) { const element = $('#notification'); element.textContent = message; element.hidden = !message; element.classList.toggle('error', error); }
function renderFabrics() {
  $('#fabrics').innerHTML = Object.entries(fabrics).map(([id, item]) => `<button class="fabric-card ${id === fabric ? 'selected' : ''}" data-fabric="${id}" aria-pressed="${id === fabric}"><span class="swatch ${id}"></span><span><strong>${item.name}</strong><small>${item.weight} g/m² <i>·</i> ${item.thickness} mm</small></span><span class="radio"></span></button>`).join('') + `<div class="fabric-details"><span>Stretch <b>${fabrics[fabric].stretch}</b></span><span>Surface <b>${fabric === 'cotton' ? 'Woven / matte' : 'Dense / soft'}</b></span></div>`;
  document.querySelectorAll<HTMLButtonElement>('[data-fabric]').forEach(button => button.onclick = () => { fabric = button.dataset.fabric as FabricId; renderFabrics(); renderScene(); });
}
function activeMeasurements() { return pattern?.measurements.rows.length ? pattern.measurements : external; }
function renderTables() {
  const measurements = activeMeasurements();
  $('#body-count').textContent = String(measurements?.rows.length ?? 0); $('#variable-count').textContent = String(pattern?.variables.length ?? 0);
  $('#body-tab').classList.toggle('active', tableTab === 'body'); $('#variables-tab').classList.toggle('active', tableTab === 'variables');
  const rows = tableTab === 'body' ? measurements?.rows ?? [] : pattern?.variables ?? [];
  const unit = tableTab === 'body' ? measurements?.unit : pattern?.unit;
  $('#table-source').textContent = rows.length ? `${tableTab === 'body' ? measurements?.source : 'Embedded in pattern'} · ${unit}` : '';
  if (!rows.length) $('#table-content').innerHTML = `<div class="table-empty"><span>≡</span><div><strong>${tableTab === 'body' ? 'No body measurements loaded' : 'No pattern variables'}</strong><p>${tableTab === 'body' ? 'Measurements embedded in your pattern appear here. Otherwise, load a .smis file.' : 'Custom drafting inputs appear here when included in your pattern.'}</p></div></div>`;
  else $('#table-content').innerHTML = `<table><thead><tr><th>${tableTab === 'body' ? 'Measurement' : 'Variable'}</th><th>Value</th><th>Formula / description</th></tr></thead><tbody>${rows.map(row => tableRow(row, tableTab === 'body' ? unit ?? '' : '')).join('')}</tbody></table>`;
  const reference = pattern?.measurementPath;
  $('#measurement-info').innerHTML = measurements ? `<p class="info-line"><span class="status-dot"></span>${measurements.rows.length} measurements · ${escape(measurements.unit)}</p><p class="muted filename">${escape(measurements.source)}</p>${external && pattern?.measurements.rows.length ? '<p class="footnote">Embedded measurements take priority over the external file.</p>' : ''}` : `<p class="muted">${reference ? `This pattern references <strong>${escape(reference)}</strong>. Select that file to load its values.` : 'No embedded body measurements. Load the .smis file used for this draft.'}</p>`;
  $('#clear-measurements').hidden = !external;
}
function tableRow(row: Measurement, unit: string) {
  return `<tr><td><strong>${escape(row.label)}</strong><small>${escape(row.name)}</small></td><td class="numeric ${row.error ? 'unresolved' : ''}">${number(row.value)}${row.value !== undefined && unit ? `<span>${escape(unit)}</span>` : ''}</td><td>${escape(row.description || row.formula)}${row.error ? `<small class="error">${escape(row.error)}</small>` : ''}</td></tr>`;
}
function renderPattern() {
  $('#pattern-info').innerHTML = pattern ? `<div class="loaded-file"><span>▧</span><div><strong>${escape(filename)}</strong><small>${pattern.pieces.length} pieces · ${escape(pattern.unit)} <span>✓</span></small></div></div>${pattern.description ? `<p class="pattern-description">${escape(pattern.description)}</p>` : ''}${pattern.notes ? `<details><summary>Pattern notes</summary><p class="footnote">${escape(pattern.notes)}</p></details>` : ''}${pattern.warnings.length ? `<details class="warnings" open><summary>${pattern.warnings.length} import notice${pattern.warnings.length === 1 ? '' : 's'}</summary><ul>${pattern.warnings.map(warning => `<li>${escape(warning)}</li>`).join('')}</ul></details>` : ''}` : '';
  $('#view-title').textContent = pattern ? filename.replace(/\.(sm2d|val)$/i, '') : 'Your pattern, in a new light.';
  $('#empty-state').hidden = !!pattern;
  $('#body-tab').onclick = () => { tableTab = 'body'; renderTables(); };
  $('#variables-tab').onclick = () => { tableTab = 'variables'; renderTables(); };
  renderTables(); renderAssembly(); renderScene();
}
function renderScene() {
  scene?.update(pattern, assembly, fabric, mode, selected, sewn, showEdges);
  $('#assembly-mode').classList.toggle('active', mode === 'assembly'); $('#pieces-mode').classList.toggle('active', mode === 'pieces');
  $('#scene-badge').textContent = !pattern ? 'READY WHEN YOU ARE' : mode === 'pieces' ? 'PIECE OUTLINES' : sewn ? 'SEAM PREVIEW' : assembly.instances.length ? 'PLACEMENT & SEAMS' : 'ASSEMBLY SETUP NEEDED';
  const gap = sewn ? ` · mean seam gap ${number(scene?.seamGap())} mm` : '';
  $('#scene-stats').textContent = pattern ? `${pattern.pieces.length} source pieces · ${assembly.instances.length} placed · ${assembly.seams.length} seams${gap}` : 'No pattern loaded';
}
function selectedInstance() { return assembly.instances.find(instance => instance.id === selected); }
function renderAssembly() {
  const instance = selectedInstance();
  $('#assembly-content').innerHTML = !pattern ? `<div class="setup-empty"><span>↗</span><h3>A garment needs a little context.</h3><p>Open a pattern to add cut copies, place each piece and connect its sewn edges.</p><div class="checklist"><span>01 &nbsp; Copies & mirroring</span><span>02 &nbsp; Position & orientation</span><span>03 &nbsp; Seam connections</span></div></div>` : `
  <p class="setup-intro">${assembly.instances.length ? 'Select a copy to position it. Connect matching edges, then preview the sewn shape.' : 'This file has no 3D assembly. Provide the cut copies, mirroring, placements and seam pairings below.'}</p>
  <div class="assembly-actions"><button id="save-assembly" class="button small secondary" ${!assembly.instances.length ? 'disabled' : ''}>Save setup ↓</button><button id="load-assembly" class="button small secondary">Load setup ↑</button></div>
  <label class="field-label">Add a cut copy<select id="add-piece"><option value="">Select a pattern piece…</option>${pattern.pieces.map(piece => `<option value="${escape(piece.id)}">${escape(piece.name)} (cut ${piece.quantity})</option>`).join('')}</select></label>
  <div class="instance-list">${assembly.instances.map(item => `<button class="instance ${item.id === selected ? 'active' : ''}" data-instance="${escape(item.id)}"><span>◇</span><strong>${escape(item.name)}</strong><small>${item.mirrored ? 'MIRROR' : ''}</small></button>`).join('') || '<p class="footnote">Add each piece as many times as it is cut. Mark mirrored copies explicitly.</p>'}</div>
  ${instance ? placementForm(instance) : ''}
  <div class="seams-title"><h3>Seam connections <span>${assembly.seams.length}</span></h3><button id="add-seam" class="tool-button" ${assembly.instances.length ? '' : 'disabled'}>＋ Add</button></div>
  <div class="seam-list">${assembly.seams.map((seam, i) => `<div><span><b>${i+1}</b> ${escape(edgeName(seam.a))}<br><small>↳ ${escape(edgeName(seam.b))}${seam.reverse ? ' · reversed' : ''}</small></span><button data-delete-seam="${seam.id}" class="tool-button" aria-label="Remove seam ${i+1}">×</button></div>`).join('') || '<p class="footnote">Which edges are sewn together? Choose a piece to see its numbered edges.</p>'}</div>
  <button id="sew" class="button primary full" ${assembly.seams.length ? '' : 'disabled'}>${sewn ? 'Edit placements' : 'Preview sewn shape'} <span>↗</span></button>
  <p class="footnote">Seam lines only; allowance offsets and physical draping are not calculated. Unconnected edges remain open.</p>`;
  if (!pattern) return;
  $('#add-piece').onchange = e => {
    const piece = pattern!.pieces.find(p => p.id === (e.target as HTMLSelectElement).value); if (!piece) return;
    if (assembly.instances.length >= 40) { notify('The preview supports up to 40 cut copies.', true); return; }
    const item = createInstance(piece, assembly.instances.length); assembly.instances.push(item); selected = item.id; changed(); scene?.fit();
  };
  document.querySelectorAll<HTMLButtonElement>('[data-instance]').forEach(button => button.onclick = () => { selected = button.dataset.instance!; mode = 'assembly'; renderAssembly(); renderScene(); });
  $('#load-assembly').onclick = () => $('#assembly-file').click();
  $('#save-assembly').onclick = saveAssembly;
  $('#add-seam').onclick = openSeamDialog;
  $('#sew').onclick = () => { sewn = !sewn; mode = 'assembly'; renderAssembly(); renderScene(); scene?.fit(); };
  document.querySelectorAll<HTMLButtonElement>('[data-delete-seam]').forEach(button => button.onclick = () => { assembly.seams = assembly.seams.filter(s => s.id !== button.dataset.deleteSeam); changed(); });
  if (instance) {
    $('#mirror').onchange = e => { instance.mirrored = (e.target as HTMLInputElement).checked; changed(); };
    $('#delete-instance').onclick = () => { assembly.instances = assembly.instances.filter(i => i.id !== instance.id); assembly.seams = assembly.seams.filter(s => s.a.instance !== instance.id && s.b.instance !== instance.id); selected = ''; changed(); };
    document.querySelectorAll<HTMLInputElement>('[data-vector]').forEach(input => input.onchange = () => {
      const value = Number(input.value); if (!Number.isFinite(value) || Math.abs(value) > 100000) return;
      instance[input.dataset.vector as 'position' | 'rotation'][Number(input.dataset.axis)] = value; sewn = false; renderAssembly(); renderScene();
    });
    $('#wrap').onchange = e => { instance.wrap = Number((e.target as HTMLInputElement).value); sewn = false; renderAssembly(); renderScene(); };
  }
}
function placementForm(instance: Placement) {
  return `<div class="placement"><div class="placement-title"><h3>Placement</h3><button id="delete-instance" class="text-button danger">Remove copy</button></div><label class="checkbox-label"><input id="mirror" type="checkbox" ${instance.mirrored ? 'checked' : ''}> Mirror pattern horizontally</label>${(['position','rotation'] as const).map(type => `<label class="field-label">${type === 'position' ? 'Position · mm' : 'Rotation · degrees'}</label><div class="vector">${['X','Y','Z'].map((axis, i) => `<label>${axis}<input type="number" step="${type === 'position' ? '5' : '10'}" data-vector="${type}" data-axis="${i}" value="${instance[type][i]}" aria-label="${type} ${axis}"></label>`).join('')}</div>`).join('')}<label class="field-label">Initial curvature · degrees<input id="wrap" type="range" min="-350" max="350" value="${instance.wrap}" aria-label="Initial curvature"></label><p class="footnote">Curve a panel around the body before joining it. Use X/Y/Z to align matching seam edges.</p></div>`;
}
function changed() { sewn = false; mode = 'assembly'; renderAssembly(); renderScene(); }
function edgeName(ref: EdgeRef) {
  const instance = assembly.instances.find(i => i.id === ref.instance); return `${instance?.name ?? '?'} / edge ${ref.edge+1}`;
}
function openSeamDialog() {
  if (assembly.seams.length >= 100) { notify('The preview supports up to 100 seam connections.', true); return; }
  const used = new Set(assembly.seams.flatMap(s => [`${s.a.instance}:${s.a.edge}`, `${s.b.instance}:${s.b.edge}`]));
  const options = assembly.instances.flatMap(instance => pattern!.pieces.find(p => p.id === instance.pieceId)!.edges.map((edge, index) => {
    const key = `${instance.id}:${index}`; return used.has(key) ? '' : `<option value="${key}">${escape(instance.name)} / ${edge.name}</option>`;
  })).join('');
  $('#seam-a').innerHTML = options; $('#seam-b').innerHTML = options; ($('#seam-b') as HTMLSelectElement).selectedIndex = 1;
  $('#seam-error').textContent = ''; ($('#seam-dialog') as HTMLDialogElement).showModal();
}
$('#close-seam').onclick = () => ($('#seam-dialog') as HTMLDialogElement).close();
$('#seam-form').onsubmit = event => {
  event.preventDefault();
  const a = $('#seam-a') as HTMLSelectElement, b = $('#seam-b') as HTMLSelectElement;
  if (!a.value || !b.value || a.value === b.value) { $('#seam-error').textContent = 'Choose two different, unused edges.'; return; }
  const ref = (value: string): EdgeRef => { const [instance, edge] = value.split(':'); return { instance, edge: Number(edge) }; };
  assembly.seams.push({ id: crypto.randomUUID(), a: ref(a.value), b: ref(b.value), reverse: ($('#seam-reverse') as HTMLInputElement).checked });
  ($('#seam-dialog') as HTMLDialogElement).close(); changed();
};
async function readFile(file: File) { if (file.size > 10_000_000) throw new Error('File limit is 10 MB.'); return file.text(); }
async function loadPattern(file: File) {
  try {
    const nextSource = await readFile(file), next = parsePattern(nextSource);
    source = nextSource; filename = file.name; pattern = next; external = undefined; assembly = emptyAssembly(); selected = ''; sewn = false; mode = 'pieces'; tableTab = next.measurements.rows.length ? 'body' : next.variables.length ? 'variables' : 'body';
    notify('Pattern loaded. To assemble it, add cut copies and supply their placement and seam connections.'); renderPattern();
  } catch (error) { notify((error as Error).message, true); }
}
($('#pattern-file') as HTMLInputElement).onchange = async event => { const input = event.target as HTMLInputElement; if (input.files?.[0]) await loadPattern(input.files[0]); input.value = ''; };
($('#measurement-file') as HTMLInputElement).onchange = async event => {
  const input = event.target as HTMLInputElement;
  try {
    if (!input.files?.[0]) return;
    const next = parseMeasurements(await readFile(input.files[0]), input.files[0].name);
    const nextPattern = source ? parsePattern(source, next) : undefined;
    external = next; if (nextPattern) { pattern = nextPattern; reconcileAssembly(); }
    tableTab = 'body'; notify(next.rows.some(row => row.error) ? 'Measurements loaded. Some formulas have unresolved inputs; see the table.' : 'Measurements loaded.'); renderPattern();
  } catch (error) { notify((error as Error).message, true); } finally { input.value = ''; }
};
function reconcileAssembly() {
  assembly.instances = assembly.instances.filter(i => pattern!.pieces.some(p => p.id === i.pieceId));
  const valid = (ref: EdgeRef) => { const i = assembly.instances.find(i => i.id === ref.instance); return !!pattern!.pieces.find(p => p.id === i?.pieceId)?.edges[ref.edge]; };
  assembly.seams = assembly.seams.filter(s => valid(s.a) && valid(s.b)); sewn = false;
}
$('#clear-measurements').onclick = () => { external = undefined; if (source) { pattern = parsePattern(source); reconcileAssembly(); } renderPattern(); };
const dropZone = $('#drop-zone');
dropZone.ondragover = e => { e.preventDefault(); dropZone.classList.add('dragover'); }; dropZone.ondragleave = () => dropZone.classList.remove('dragover');
dropZone.ondrop = async e => { e.preventDefault(); dropZone.classList.remove('dragover'); const file = e.dataTransfer?.files[0]; if (file) await loadPattern(file); };
$('#assembly-mode').onclick = () => { mode = 'assembly'; selected = selectedInstance()?.id ?? ''; renderScene(); };
$('#pieces-mode').onclick = () => { mode = 'pieces'; selected = ''; renderScene(); };
$('#fit').onclick = () => scene?.fit();
$('#show-edges').onchange = e => { showEdges = (e.target as HTMLInputElement).checked; renderScene(); };
document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(button => button.onclick = () => scene?.fit(button.dataset.camera as 'front' | 'back' | 'top'));
function saveAssembly() {
  const blob = new Blob([JSON.stringify(assembly, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${filename.replace(/\.[^.]+$/, '')}.assembly.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
($('#assembly-file') as HTMLInputElement).onchange = async event => {
  const input = event.target as HTMLInputElement;
  try { if (input.files?.[0] && pattern) { assembly = validateAssembly(JSON.parse(await readFile(input.files[0])), pattern.pieces); selected = assembly.instances[0]?.id ?? ''; changed(); scene?.fit(); notify('Assembly setup loaded.'); } }
  catch (error) { notify((error as Error).message, true); } finally { input.value = ''; }
};
$('#load-demo').onclick = async () => {
  try {
    const response = await fetch('/examples/sleeveless-shell.sm2d'); if (!response.ok) throw new Error('The example could not be loaded.');
    source = await response.text(); filename = 'sleeveless-shell.sm2d'; pattern = parsePattern(source); external = undefined; assembly = emptyAssembly();
    const front = createInstance(pattern.pieces[0], 0), back = createInstance(pattern.pieces[1], 1);
    front.position = [0, 0, 100]; front.wrap = -130; back.position = [0, 0, -100]; back.rotation = [0, 180, 0]; back.wrap = -130;
    assembly.instances = [front, back];
    for (const [a, b] of [[8, 10], [10, 8], [0, 5], [5, 0]]) assembly.seams.push({ id: crypto.randomUUID(), a: { instance: front.id, edge: a }, b: { instance: back.id, edge: b }, reverse: true });
    selected = front.id; sewn = true; mode = 'assembly'; tableTab = 'body'; notify('Example assembly loaded: two panels with side and shoulder seams. Select Edit placements to explore the setup.'); renderPattern(); scene?.fit();
  } catch (error) { notify((error as Error).message, true); }
};
renderFabrics(); renderPattern();
window.addEventListener('beforeunload', () => scene?.dispose());
