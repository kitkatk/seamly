import './style.css';
import { parseMeasurements, parsePattern, type Measurements, type Pattern, type Measurement } from './pattern';
import { fabrics, type FabricId } from './fabrics';
import { PatternScene } from './scene';
import { emptyAssembly, validateAssembly, type Assembly, type EdgeRef, type Placement } from './assembly';
import { renderBoard, formatLength, pieceThumbnail } from './board';
import { steps, copyChoices, prepareCopies, canVisit, blockedReason, applyPreset, edgeFor, edgeKey, sameEdge, edgeLength, suggestedReverse, unusedEdges, addSeam, History, type Step, type CopyChoices, type PlacementPreset } from './workflow';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const number = (value?: number) => value === undefined ? 'Unresolved' : new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value);
let source = '', filename = '', pattern: Pattern | undefined, external: Measurements | undefined;
let assembly = emptyAssembly(), choices: CopyChoices = {}, step: Step = 0, selected = '';
let fabric: FabricId = 'cotton', sewn = true, tableTab: 'body' | 'variables' = 'body', demo = false;
let first: EdgeRef | undefined, second: EdgeRef | undefined, reverse = true, activeSeam = '';
let saved = JSON.stringify(assembly), previewBusy = false;
let renderedStep: Step | undefined;
const history = new History<Assembly>();
let scene: PatternScene | undefined;
const hasUnsaved = () => JSON.stringify(assembly) !== saved;
const instance = () => assembly.instances.find(i => i.id === selected);
const remaining = () => assembly.instances.filter(i => !i.arranged);
const copyTotal = () => Object.values(choices).reduce((sum, choice) => sum + choice.count, 0);
const draft = () => first && second ? { id: 'draft', a: first, b: second, reverse } : undefined;

$('#app').innerHTML = `
<header class="header">
  <a class="brand" href="/" aria-label="Seamly Pattern Studio"><span class="brand-icon">s</span><b>seamly<span> / pattern studio</span></b></a>
  <span class="local-label">Files stay on your computer</span>
</header>
<main class="app-main">
  <section id="welcome" class="welcome">
    <span class="eyebrow">YOUR FIRST 3D ASSEMBLY</span>
    <h1>Let’s put your pattern together.</h1>
    <p>Open a Seamly pattern. We’ll guide you through making the fabric pieces,<br>placing them, and choosing the edges you would sew together.</p>
    <div class="welcome-actions"><button id="welcome-open" class="button primary">Open a .sm2d pattern</button><button id="load-demo" class="button secondary">Try the guided example</button></div>
    <p class="welcome-hint">New to this? The example walks you through a simple sleeveless top.</p>
    <ol class="welcome-overview"><li><span>1</span><strong>Prepare pieces</strong><p>Choose how many to cut.</p></li><li><span>2</span><strong>Arrange in 3D</strong><p>Put them at the front or back.</p></li><li><span>3</span><strong>Join edges</strong><p>Click the edges to sew together.</p></li><li><span>4</span><strong>Preview & save</strong><p>Check the shape and keep your work.</p></li></ol>
  </section>
  <div id="notification" role="status" aria-live="polite" hidden></div>
  <section id="workspace" hidden>
    <div class="project-bar"><div><span class="eyebrow">PATTERN</span><h1 id="view-title"></h1><span id="save-status" role="status"></span></div><div class="project-actions"><button id="undo" class="button small secondary" title="Undo (⌘/Ctrl Z)">Undo</button><button id="redo" class="button small secondary" title="Redo (⌘/Ctrl Shift Z)">Redo</button><span class="action-divider"></span><button id="save-anytime" class="button small secondary">Save progress</button><button id="load-assembly" class="button small secondary">Open saved assembly</button><button id="change-pattern" class="button small secondary">Change pattern</button></div></div>
    <nav id="steps" class="stepper" aria-label="Assembly steps"></nav>
    <div class="step-intro"><div><span id="step-number" class="eyebrow"></span><h2 id="step-title" tabindex="-1"></h2><p id="step-description"></p></div><button id="settings-toggle" class="button small secondary" aria-expanded="false">Fabric & measurements</button></div>
    <div class="assembly-workspace">
      <section class="flat-panel" aria-labelledby="flat-title"><div class="panel-heading"><h3 id="flat-title">Your flat pieces</h3><span id="flat-hint"></span></div><div id="board" class="pattern-board"></div><p id="board-instruction" class="board-instruction"></p></section>
      <section class="preview-panel" aria-labelledby="preview-title"><div class="panel-heading"><h3 id="preview-title">3D view</h3><button id="fit" class="text-button">Fit everything</button></div><div class="stage"><div id="viewport"></div><div class="stage-top"><span id="scene-badge" class="badge"></span></div><div class="stage-bottom"><span id="camera-help">Drag to look around · Scroll to zoom</span><div class="view-buttons"><button data-camera="front">Front</button><button data-camera="back">Back</button><button data-camera="top">Top</button></div></div></div><div class="preview-caption">Shape preview, not a fit simulation.<span id="scene-stats"></span></div></section>
      <aside class="inspector" aria-label="Current assembly step"><div id="step-content" class="step-content"></div><div id="step-footer" class="step-footer"></div></aside>
    </div>
    <details id="settings" class="settings"><summary>Pattern details, fabric & measurements</summary><div class="settings-grid"><section><h2>Pattern details</h2><div id="pattern-info"></div><h2>Fabric</h2><div id="fabrics"></div><p class="footnote">Illustrative presets. Actual properties vary by supplier.</p></section><section><h2>Body measurements</h2><div id="measurement-info"></div><button id="load-measurements" class="button secondary">Open a .smis file</button><button id="clear-measurements" class="text-button" hidden>Remove external measurements</button><div class="data-panel"><div class="data-header"><div class="data-tabs"><button id="body-tab" class="active">Body measurements <span id="body-count">0</span></button><button id="variables-tab">Pattern variables <span id="variable-count">0</span></button></div><span id="table-source"></span></div><div id="table-content" class="table-scroll"></div></div></section></div></details>
  </section>
</main>
<input id="pattern-file" type="file" accept=".sm2d,.val" hidden>
<input id="measurement-file" type="file" accept=".smis,.vit" hidden>
<input id="assembly-file" type="file" accept=".json" hidden>`;

try {
  scene = new PatternScene($('#viewport'), id => selectPiece(id), (id, position) => {
    const target = assembly.instances.find(i => i.id === id); if (!target) return;
    change('Move piece', () => { target.position = position; target.arranged = true; });
  });
} catch { notify('The 3D view needs WebGL. Enable it in a current browser. You can still prepare pieces, join edges and save an assembly.', true); }

function notify(message: string, error = false) {
  const element = $('#notification'); element.textContent = message; element.hidden = !message; element.classList.toggle('error', error);
  if (pattern && !$('#workspace').hidden) sizeWorkspace();
}
function clearDraft() { first = undefined; second = undefined; activeSeam = ''; }
function change(label: string, action: () => void) {
  const before = structuredClone(assembly);
  try {
    action();
    if (JSON.stringify(before) !== JSON.stringify(assembly)) history.checkpoint(before, label);
    clampStep(); render(); return true;
  } catch (error) { assembly = before; notify((error as Error).message, true); return false; }
}
function copiesChanged() {
  return Object.entries(choices).some(([id, choice]) => {
    const copies = assembly.instances.filter(item => item.pieceId === id);
    return copies.length !== choice.count || choice.applyMirroring && copies.some((item, index) => item.mirrored !== (choice.mirroredPairs && index % 2 === 1));
  });
}
function clampStep() {
  while (step > 0 && !canVisit(step, assembly)) step = (step - 1) as Step;
  if (!assembly.instances.some(i => i.id === selected)) selected = assembly.instances[0]?.id ?? '';
}
function go(next: Step) {
  if (next === step) return;
  if ((first || second) && next !== 2) { notify('Save this seam or cancel the edge selection before changing steps.'); return; }
  if (!canVisit(next, assembly)) { notify(blockedReason(next, assembly)); return; }
  if (step === 0 && next > 0 && copiesChanged()) { notify('Apply your piece changes with Update pieces & continue first.'); return; }
  step = next; activeSeam = ''; notify('');
  if (step === 1) selected = remaining()[0]?.id ?? selected;
  if (step === 3) sewn = true;
  if (step === 0) choices = copyChoices(pattern!.pieces, assembly.instances.length ? assembly : undefined);
  render(); $('#step-content').scrollTop = 0; $('#board').scrollTop = 0; scene?.fit(); $('#step-title').focus({preventScroll:true});
}
function render() {
  const focused = document.activeElement as HTMLElement | null;
  const focusId = focused?.id;
  const restoreFocus = !!focused?.closest('#step-content, #step-footer');
  const openSections = renderedStep === step ? Array.from(document.querySelectorAll<HTMLDetailsElement>('#step-content details[open]')).map(element => element.className) : [];
  $('#welcome').hidden = !!pattern; $('#workspace').hidden = !pattern;
  if (!pattern) return;
  $('#view-title').textContent = filename;
  $('#save-status').textContent = hasUnsaved() ? 'Unsaved changes' : assembly.instances.length ? 'Progress saved' : `${pattern.pieces.length} pattern outlines`;
  $('#undo').toggleAttribute('disabled', !history.canUndo); $('#redo').toggleAttribute('disabled', !history.canRedo);
  $('#save-anytime').toggleAttribute('disabled', !assembly.instances.length);
  $('#steps').innerHTML = steps.map((label, index) => {
    const allowed = canVisit(index as Step, assembly);
    const complete = index === 0 ? assembly.instances.length > 0 : index === 1 ? !!assembly.instances.length && !remaining().length : index === 2 ? assembly.seams.length > 0 : !!assembly.seams.length && !hasUnsaved();
    return `<button data-step="${index}" class="step ${index === step ? 'active' : ''} ${complete ? 'complete' : ''}" ${index === step ? 'aria-current="step"' : ''} ${!allowed ? `aria-disabled="true" title="${blockedReason(index as Step, assembly)}"` : ''}><span>${complete && index !== step ? '✓' : index+1}</span><strong>${label}</strong><small>${index === 0 ? `${assembly.instances.length || copyTotal()} pieces` : index === 1 ? `${assembly.instances.length-remaining().length}/${assembly.instances.length} positioned` : index === 2 ? `${assembly.seams.length} seams` : hasUnsaved() ? 'Not saved yet' : 'Save your setup'}</small></button>`;
  }).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(button => button.onclick = () => go(Number(button.dataset.step) as Step));
  const titles = ['How many of each piece will you sew?', 'Put each piece roughly where it belongs.', 'Choose the edges you would sew together.', 'Check the shape, then save your assembly.'];
  const descriptions = [
    'A pattern outline is a template. Create one fabric piece for every copy you would cut, including left and right sides.',
    'Choose a piece, then give it a starting position. It only needs to be close; the seams will pull the matching edges together.',
    'In the flat view, click one edge and then the edge it joins. Check the ends and save the seam. Leave hems and openings unjoined.',
    'Look around the joined garment. If something looks twisted, go back to adjust its placement or swap the seam ends.',
  ];
  $('#step-number').textContent = `STEP ${step+1} OF 4`;
  $('#step-title').textContent = titles[step]; $('#step-description').textContent = descriptions[step];
  $('#flat-title').textContent = step === 0 && !assembly.instances.length ? 'Pattern templates' : 'Your flat pieces';
  $('#flat-hint').textContent = step === 2 ? 'Click edges here' : 'Click a piece to select it';
  $('#board-instruction').textContent = step === 2 ? first ? second ? 'Both edges selected. Check their ends, then save this seam.' : 'Now click the edge that joins A. Press Escape to cancel.' : 'Start a seam: click its first edge. Joined edges share a colour.' : 'The flat view keeps the outlines easy to recognise while you work in 3D.';
  const reviewedSeam = assembly.seams.find(seam => seam.id === activeSeam);
  renderBoard($('#board'), { pieces: pattern.pieces, assembly, selected, joining: step === 2, first: first ?? reviewedSeam?.a, second: second ?? reviewedSeam?.b, reverse: reviewedSeam?.reverse ?? reverse, activeSeam, onPiece: selectPiece, onEdge: selectEdge });
  renderStep();
  for (const name of openSections) $('#step-content').querySelector<HTMLDetailsElement>(`details.${CSS.escape(name)}`)?.setAttribute('open', '');
  if (renderedStep === step && focusId && restoreFocus) document.getElementById(focusId)?.focus({preventScroll:true});
  renderedStep = step;
  sizeWorkspace(); renderScene();
}
function sizeWorkspace() {
  const workspace = $('.assembly-workspace');
  const documentTop = workspace.getBoundingClientRect().top + scrollY;
  workspace.style.height = innerWidth > 950 ? `${Math.max(350, Math.min(780, innerHeight - documentTop - 16))}px` : '';
}
function renderScene() {
  scene?.update(pattern, assembly, fabric, step === 0 ? 'pieces' : 'assembly', step === 0 ? '' : selected, step === 3 && sewn, true, { arranging: step === 1, showEdgeNumbers: step === 2, draft: draft(), first, second, activeSeam });
  $('#scene-badge').textContent = step === 0 ? 'PATTERN OUTLINES' : step === 1 ? 'STARTING POSITIONS' : step === 2 ? 'CHECK THE STITCH LINES' : sewn ? 'JOINED SHAPE' : 'BEFORE JOINING';
  $('#camera-help').textContent = step === 1 ? 'Drag the arrows to move · Drag elsewhere to look around' : 'Drag to look around · Scroll to zoom';
  $('#scene-stats').textContent = `${assembly.instances.length} fabric pieces · ${assembly.seams.length} seams`;
}
function selectPiece(id: string) { selected = id; render(); }
function renderStep() {
  const content = $('#step-content'), footer = $('#step-footer');
  if (step === 0) {
    const total = copyTotal();
    content.innerHTML = `<h3>1. Choose your fabric pieces</h3><p>The quantities below come from your pattern. Check them against your cutting instructions.</p>${pattern!.pieces.map(piece => {
      const choice = choices[piece.id];
      return `<div class="copy-row">${pieceThumbnail(piece)}<div class="copy-info"><strong>${escape(piece.name)}</strong><span>Pattern suggests ${piece.quantity}</span><div class="quantity-control"><button data-count="${escape(piece.id)}" data-delta="-1" aria-label="Fewer ${escape(piece.name)} pieces" ${choice.count === 0 ? 'disabled' : ''}>−</button><input data-quantity="${escape(piece.id)}" type="number" min="0" max="40" step="1" value="${choice.count}" aria-label="Number of ${escape(piece.name)} pieces"><button data-count="${escape(piece.id)}" data-delta="1" aria-label="More ${escape(piece.name)} pieces">+</button></div>${choice.count > 1 ? `<label class="checkbox-label"><input type="checkbox" data-mirror-pairs="${escape(piece.id)}" ${choice.mirroredPairs ? 'checked' : ''}> Make mirrored left/right pairs</label>` : ''}</div></div>`;
    }).join('')}${!pattern!.pieces.length ? `<div class="callout warning"><strong>No piece outlines are available yet.</strong><p>${pattern!.measurementPath ? 'Open the .smis measurements referenced by this pattern, then try again.' : 'Check the import notices in Pattern details. This file may use a construction tool the viewer does not yet support.'}</p><button id="inspect-import" class="button secondary small">View pattern details</button>${pattern!.measurementPath ? '<button id="needed-measurements" class="button primary small">Open .smis measurements</button>' : ''}</div>` : ''}<div class="callout"><strong>What is a mirrored pair?</strong><p>Two copies with opposite shapes, like a left and right trouser leg. Choose this only when your cutting instructions call for it.</p></div>${demo ? '<p class="example-tip">For this example: keep one Front and one Back. No mirrored copies are needed.</p>' : ''}`;
    footer.innerHTML = `<span class="next-explanation">${total > 40 || total < 1 ? 'Choose between 1 and 40 fabric pieces in total.' : `Next: give ${total === 1 ? 'this piece' : 'each piece'} a starting position in 3D.`}</span><button id="prepare" class="button primary full" ${!pattern!.pieces.length || total < 1 || total > 40 ? 'disabled' : ''}>${assembly.instances.length ? 'Update pieces & continue' : `Create ${total} fabric piece${total === 1 ? '' : 's'}`} →</button>`;
    document.querySelectorAll<HTMLButtonElement>('[data-count]').forEach(button => button.onclick = () => { const choice = choices[button.dataset.count!]; choice.count = Math.max(0, Math.min(40, choice.count + Number(button.dataset.delta))); render(); });
    document.querySelectorAll<HTMLInputElement>('[data-quantity]').forEach(input => input.onchange = () => {
      if (!Number.isInteger(Number(input.value)) || Number(input.value) < 0 || Number(input.value) > 40) { input.setCustomValidity('Choose a whole number from 0 to 40.'); input.reportValidity(); return; }
      choices[input.dataset.quantity!].count = Number(input.value); render();
    });
    document.querySelectorAll<HTMLInputElement>('[data-mirror-pairs]').forEach(input => input.onchange = () => { choices[input.dataset.mirrorPairs!].mirroredPairs = input.checked; choices[input.dataset.mirrorPairs!].applyMirroring = true; });
    $('#prepare').onclick = () => {
      change('Prepare fabric pieces', () => { assembly = prepareCopies(assembly, pattern!.pieces, choices); });
      if (assembly.instances.length) go(1);
    };
    if (!pattern!.pieces.length) {
      $('#inspect-import').onclick = openSettings;
      if (pattern!.measurementPath) $('#needed-measurements').onclick = () => $('#measurement-file').click();
    }
  } else if (step === 1) {
    content.innerHTML = `<h3>2. Give each piece a starting position</h3><p><strong>${assembly.instances.length-remaining().length} of ${assembly.instances.length}</strong> positioned. Choose any piece below to adjust it.</p>${pieceList()}${instance() ? placementForm(instance()!) : ''}${demo ? '<p class="example-tip">For this top: place Front at the front and Back at the back. The default curve is enough to begin.</p>' : ''}`;
    footer.innerHTML = `<span class="next-explanation">${remaining().length ? `${remaining().length} piece${remaining().length === 1 ? '' : 's'} still need a starting position. ${instance()?.arranged ? 'Move on to the next one.' : 'Choose Front, Back or a side above.'}` : 'All pieces have a starting position. Next: choose the edges to sew.'}</span><div class="footer-buttons"><button id="back" class="button secondary">Back</button><button id="next" class="button primary" ${remaining().length && !instance()?.arranged ? 'disabled' : ''}>${remaining().length ? 'Position next piece →' : 'Continue to join edges →'}</button></div>`;
    bindPieceList(); bindPlacement(); $('#back').onclick = () => go(0);
    $('#next').onclick = () => {
      if (!remaining().length) go(2);
      else { const next = remaining().find(i => i.id !== selected) ?? remaining()[0]; selected = next.id; render(); $('#placement-heading').focus({preventScroll:true}); }
    };
  } else if (step === 2) renderJoining(content, footer);
  else renderReview(content, footer);
}
function pieceList() {
  return `<div class="instance-list">${assembly.instances.map(i => `<button class="instance ${selected === i.id ? 'active' : ''}" data-instance="${i.id}" aria-pressed="${selected === i.id}"><span>${i.arranged ? '✓' : '○'}</span><strong>${escape(i.name)}</strong><small>${i.arranged ? 'Positioned' : 'Choose position'}</small></button>`).join('')}</div>`;
}
function bindPieceList() { document.querySelectorAll<HTMLButtonElement>('[data-instance]').forEach(button => button.onclick = () => selectPiece(button.dataset.instance!)); }
function placementForm(item: Placement) {
  return `<section class="placement"><h4 id="placement-heading" tabindex="-1">${escape(item.name)}</h4><label class="field-label">Where does it belong?</label><div class="placement-presets">${(['front','back','left','right','flat'] as const).map(preset => `<button class="button secondary small" data-preset="${preset}">${preset === 'flat' ? 'Keep flat' : preset === 'left' ? 'Left side' : preset === 'right' ? 'Right side' : preset[0].toUpperCase()+preset.slice(1)}</button>`).join('')}</div><p class="field-help">These buttons set a rough starting position. You can move the piece with the arrows in the 3D view.</p><label class="checkbox-label"><input id="mirror" type="checkbox" ${item.mirrored ? 'checked' : ''}> Mirror this fabric piece</label><label class="field-label">Move a little</label><div class="move-controls"><button data-move="0:-20" aria-label="Move piece left">← Left</button><button data-move="1:20" aria-label="Move piece up">↑ Up</button><button data-move="2:20" aria-label="Move piece forward">Forward</button><button data-move="0:20" aria-label="Move piece right">Right →</button><button data-move="1:-20" aria-label="Move piece down">↓ Down</button><button data-move="2:-20" aria-label="Move piece backward">Backward</button></div><label class="field-label" for="wrap">Curve around the garment <output>${Math.abs(item.wrap)}°</output></label><input id="wrap" type="range" min="-300" max="300" value="${item.wrap}"><div class="range-labels"><span>Curve one way</span><span>Flat</span><span>Curve the other way</span></div><details class="advanced"><summary>Fine-tune position & rotation</summary><p class="field-help">Position is in millimetres. Rotations are in degrees. X: left/right, Y: up/down, Z: front/back.</p><label class="field-label">Piece name<input id="piece-name" value="${escape(item.name)}" maxlength="100"></label>${(['position','rotation'] as const).map(type => `<label class="field-label">${type === 'position' ? 'Position (mm)' : 'Rotation (degrees)'}</label><div class="vector">${['X','Y','Z'].map((axis,i) => `<label>${axis}<input type="number" step="${type === 'position' ? 10 : 5}" data-vector="${type}" data-axis="${i}" value="${item[type][i]}" aria-label="${type} ${axis}"></label>`).join('')}</div>`).join('')}</details><button id="keep-position" class="text-button">${item.arranged ? 'Position set ✓' : 'Use the current position'}</button></section>`;
}
function bindPlacement() {
  const item = instance(); if (!item) return;
  document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button => button.onclick = () => {
    change('Set starting position', () => applyPreset(item, pattern!.pieces.find(p => p.id === item.pieceId)!, button.dataset.preset as PlacementPreset, assembly)); scene?.fit();
  });
  $('#mirror').onchange = e => change('Mirror piece', () => { item.mirrored = (e.target as HTMLInputElement).checked; });
  document.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(button => button.onclick = () => change('Move piece', () => { const [axis, amount] = button.dataset.move!.split(':').map(Number); item.position[axis] += amount; item.arranged = true; }));
  $('#wrap').onchange = e => change('Curve piece', () => { item.wrap = Number((e.target as HTMLInputElement).value); });
  $('#piece-name').onchange = e => change('Rename piece', () => { item.name = (e.target as HTMLInputElement).value.trim() || item.name; });
  $('#keep-position').onclick = () => change('Confirm starting position', () => { item.arranged = true; });
  document.querySelectorAll<HTMLInputElement>('[data-vector]').forEach(input => input.onchange = () => {
    const value = Number(input.value);
    if (!Number.isFinite(value) || Math.abs(value) > 100000) { input.setCustomValidity('Use a number between -100000 and 100000.'); input.reportValidity(); return; }
    change('Adjust placement', () => { item[input.dataset.vector as 'position' | 'rotation'][Number(input.dataset.axis)] = value; item.arranged = true; });
  });
}
function edgeName(ref: EdgeRef) { return `${assembly.instances.find(i => i.id === ref.instance)?.name ?? 'Piece'} · edge ${ref.edge+1}`; }
function selectEdge(ref: EdgeRef) {
  const existing = assembly.seams.find(s => sameEdge(s.a, ref) || sameEdge(s.b, ref));
  if (existing) { clearDraft(); activeSeam = existing.id; selected = ref.instance; render(); $('#step-content').scrollTop = 0; return; }
  activeSeam = ''; selected = ref.instance;
  if (sameEdge(ref, first)) { first = undefined; second = undefined; }
  else if (sameEdge(ref, second)) second = undefined;
  else if (!first) first = ref;
  else { second = ref; reverse = suggestedReverse(first, second, assembly, pattern!.pieces); }
  notify(''); render(); $('#step-content').scrollTop = 0;
}
function renderJoining(content: HTMLElement, footer: HTMLElement) {
  const connection = assembly.seams.find(s => s.id === activeSeam);
  const selectedPair = draft();
  content.innerHTML = `<h3>3. Make one seam at a time</h3><div class="seam-prompt" role="status" aria-live="polite"><span class="prompt-number">${!first ? 'A' : !second ? 'B' : '✓'}</span><div><strong>${connection ? 'Review this seam' : !first ? 'Click the first edge in the flat view' : !second ? 'Now click its matching edge' : 'Check the match, then save this seam'}</strong><p>${connection ? 'Its two edges are highlighted. You can swap the ends or remove the seam.' : !first ? 'Use the outlines on the left. The edge will be highlighted as side A.' : !second ? `${escape(edgeName(first))} is side A. Choose the edge to sew to it.` : 'The stitch lines in 3D show how these edges will come together.'}</p></div></div>${(first || connection) ? `<div class="edge-selection"><div><b>A</b><span>${escape(edgeName(first ?? connection!.a))}</span></div><div><b>B</b><span>${second || connection ? escape(edgeName(second ?? connection!.b)) : 'Choose its matching edge…'}</span></div></div>` : ''}${selectedPair ? matchSummary(selectedPair.a, selectedPair.b, reverse) : connection ? matchSummary(connection.a, connection.b, connection.reverse) : ''}${connection ? '<div class="seam-edit-actions"><button id="unselect-seam" class="button secondary small">Done reviewing</button><button id="remove-active-seam" class="text-button danger">Remove this seam</button></div>' : ''}${edgePicker()}${demo ? demoSuggestion() : ''}<div class="seams-title"><h4>Saved seams <span>${assembly.seams.length}</span></h4></div><div class="seam-list">${assembly.seams.map((s,i) => `<button class="seam-row ${activeSeam === s.id ? 'active' : ''}" data-review-seam="${s.id}"><span class="seam-number">${i+1}</span><span><strong>${escape(edgeName(s.a))}</strong><small>joins ${escape(edgeName(s.b))}</small></span><span>Review</span></button>`).join('') || '<p class="field-help">No seams yet. Save your first pair above, then repeat for the other sewn edges.</p>'}</div><div class="callout"><strong>Not every edge needs a seam.</strong><p>Leave necklines, armholes, hems and other openings unjoined. Only add edges you would actually sew together.</p></div>`;
  footer.innerHTML = first
    ? `<span class="next-explanation">${second ? 'Ready to connect these edges? Save the seam, then choose another pair.' : 'Choose its matching edge in the flat view. Escape cancels this selection.'}</span><div class="footer-buttons"><button id="cancel-seam" class="button secondary">Cancel selection</button>${second ? '<button id="commit-seam" class="button primary">Save this seam</button>' : '<button class="button primary" disabled>Choose matching edge</button>'}</div>`
    : `<span class="next-explanation">${assembly.seams.length ? 'Finished adding the seams you need? Next: check the joined shape.' : 'Save at least one seam to continue. Choose your first edge in the flat view.'}</span><div class="footer-buttons"><button id="back" class="button secondary">Back</button><button id="next" class="button primary" ${!assembly.seams.length ? 'disabled' : ''}>Preview joined shape →</button></div>`;
  if (first) $('#cancel-seam').onclick = () => { clearDraft(); render(); };
  else { $('#back').onclick = () => go(1); $('#next').onclick = () => go(3); }
  if (selectedPair) $('#commit-seam').onclick = () => {
    if (!change('Add seam', () => addSeam(assembly, selectedPair.a, selectedPair.b, reverse))) return;
    clearDraft(); render(); notify(`Seam ${assembly.seams.length} saved. Choose the next two edges, or continue to preview.`);
  };
  if (selectedPair || connection) $('#swap-ends').onclick = () => {
    if (connection) change('Swap seam ends', () => { connection.reverse = !connection.reverse; });
    else { reverse = !reverse; render(); }
  };
  if (connection) {
    $('#unselect-seam').onclick = () => { activeSeam = ''; render(); };
    $('#remove-active-seam').onclick = () => { change('Remove seam', () => { assembly.seams = assembly.seams.filter(s => s.id !== activeSeam); }); activeSeam = ''; render(); notify('Seam removed. Undo is available.'); };
  }
  document.querySelectorAll<HTMLButtonElement>('[data-review-seam]').forEach(button => button.onclick = () => { clearDraft(); activeSeam = button.dataset.reviewSeam!; render(); $('#step-content').scrollTop = 0; });
  bindEdgePicker();
  if (demo && $('#suggest-seam')) $('#suggest-seam').onclick = useDemoSuggestion;
}
function matchSummary(a: EdgeRef, b: EdgeRef, reversed: boolean) {
  const lengthA = edgeLength(edgeFor(a,assembly,pattern!.pieces).edge.points), lengthB = edgeLength(edgeFor(b,assembly,pattern!.pieces).edge.points);
  const difference = Math.abs(lengthA-lengthB), mismatch = difference > Math.max(5, Math.max(lengthA,lengthB)*.05);
  return `<div class="match-summary"><div><span>Edge A <b>${formatLength(lengthA)}</b></span><span>Edge B <b>${formatLength(lengthB)}</b></span></div><p class="${mismatch ? 'warning-text' : ''}">${difference < 1 ? 'These edges are the same length.' : `${formatLength(difference)} difference${mismatch ? '. Check the match. If this is intentional easing or gathering, you can still join them.' : ' — a small length difference.'}`}</p><div class="end-matching"><span>A1 ↔ B1</span><span>A2 ↔ B2</span></div><p class="field-help">The numbered ends in the flat view show which ends meet. Crossed stitch lines? Try swapping the ends.</p><button id="swap-ends" class="button secondary small">Swap ends</button><span class="sr-only">${reversed ? 'Second edge reversed' : 'Second edge not reversed'}</span></div>`;
}
function edgePicker() {
  const available = unusedEdges(assembly, pattern!.pieces);
  const options = `<option value="">Choose an edge…</option>`+available.map(ref => `<option value="${edgeKey(ref)}">${escape(edgeName(ref))}</option>`).join('');
  return `<details class="edge-picker"><summary>Prefer choosing edges from a list?</summary><label class="field-label">Edge A<select id="edge-a">${options}</select></label><label class="field-label">Edge B<select id="edge-b">${options}</select></label></details>`;
}
function bindEdgePicker() {
  const a = $('#edge-a') as HTMLSelectElement, b = $('#edge-b') as HTMLSelectElement;
  a.value = first ? edgeKey(first) : ''; b.value = second ? edgeKey(second) : '';
  for (const [select, side] of [[a,'a'],[b,'b']] as const) select.onchange = () => {
    if (!select.value) { if (side === 'a') { first = undefined; second = undefined; } else second = undefined; render(); return; }
    const [id,index] = select.value.split(':'), ref = {instance:id,edge:Number(index)};
    if ((side === 'b' && sameEdge(ref,first)) || (side === 'a' && sameEdge(ref,second))) { notify('Choose a different edge for the other side of this seam.', true); select.value = ''; return; }
    if (side === 'a') first = ref; else if (!first) { notify('Choose edge A first.'); select.value = ''; return; } else second = ref;
    activeSeam = ''; if (first && second) reverse = suggestedReverse(first,second,assembly,pattern!.pieces); render();
  };
}
function nextDemoSeam() {
  const front = assembly.instances.find(i => i.pieceId === '1'), back = assembly.instances.find(i => i.pieceId === '2');
  if (!front || !back) return;
  const used = new Set(assembly.seams.flatMap(s => [edgeKey(s.a),edgeKey(s.b)]));
  return [[8,10],[10,8],[0,5],[5,0]].map(([a,b],i) => ({a:{instance:front.id,edge:a},b:{instance:back.id,edge:b},label:i<2 ? 'side seam' : 'shoulder seam'})).find(pair => !used.has(edgeKey(pair.a)) && !used.has(edgeKey(pair.b)));
}
function demoSuggestion() {
  const next = nextDemoSeam();
  return next ? `<div class="example-tip"><strong>Example: next ${next.label}</strong><p>${escape(edgeName(next.a))} joins ${escape(edgeName(next.b))}.</p><button id="suggest-seam" class="button secondary small">Show me these two edges</button><p class="field-help">This selects the edges so you can check and save the seam yourself.</p></div>` : '<p class="example-tip">The example’s four seams are saved. The neck, armholes and hem stay open. Continue to preview.</p>';
}
function useDemoSuggestion() { const pair = nextDemoSeam(); if (!pair) return; first = pair.a; second = pair.b; selected = first.instance; reverse = true; activeSeam = ''; render(); }
function renderReview(content: HTMLElement, footer: HTMLElement) {
  const connected = new Set(assembly.seams.flatMap(s => [s.a.instance,s.b.instance])), isolated = assembly.instances.filter(i => !connected.has(i.id));
  content.innerHTML = `<h3>4. Review your joined garment</h3><p>Drag the 3D view to look at every side. You can go back and change anything.</p><ul class="review-checklist"><li><span>✓</span><strong>${assembly.instances.length} fabric pieces</strong></li><li><span>✓</span><strong>${assembly.seams.length} saved seams</strong></li><li><span>${isolated.length ? '!' : '✓'}</span><strong>${isolated.length ? `${isolated.length} piece${isolated.length === 1 ? '' : 's'} have no seams` : 'Every piece has a seam'}</strong></li></ul>${isolated.length ? `<div class="callout warning"><strong>Check the unjoined pieces</strong><p>${isolated.map(i => escape(i.name)).join(', ')}. If these belong to the garment, go back and add their seams.</p></div>` : ''}<div class="callout"><strong>${unusedEdges(assembly,pattern!.pieces).length} edges remain open</strong><p>This is expected for necklines, hems and other openings. Check that only the intended edges stay open.</p></div><div class="review-actions"><button id="toggle-sewn" class="button secondary full">${sewn ? 'Show before joining' : 'Show joined garment'}</button><button id="review-seams" class="text-button">Twisted seam? Review the edge matches</button><button id="review-placement" class="text-button">Pieces in the wrong place? Adjust positions</button></div><details class="advanced"><summary>How accurate is this preview?</summary><p class="field-help">This closes your chosen seams into an approximate shape. It does not simulate body contact, gravity or fit, and does not remove seam allowances. The mean seam gap is <span id="gap-value">—</span>.</p></details><div id="download-message" class="callout success" ${hasUnsaved() ? 'hidden' : ''}><strong>Keep these files together</strong><p>Your .sm2d pattern, any .smis measurements, and the downloaded .assembly.json. Reopen the pattern, then choose Open saved assembly to continue.</p></div>`;
  footer.innerHTML = `<span class="next-explanation">${hasUnsaved() ? 'Last step: download your assembly so you can reopen it later.' : 'Your progress is saved. You can keep editing or download it again.'}</span><div class="footer-buttons"><button id="back" class="button secondary">Back</button><button id="save-final" class="button primary">Download assembly</button></div>`;
  $('#back').onclick = () => go(2); $('#save-final').onclick = saveAssembly;
  $('#toggle-sewn').onclick = () => { sewn = !sewn; render(); scene?.fit(); };
  $('#review-seams').onclick = () => go(2); $('#review-placement').onclick = () => go(1);
  requestAnimationFrame(() => { if (step === 3 && $('#gap-value')) $('#gap-value').textContent = sewn ? `${number(scene?.seamGap())} mm` : 'shown in the joined view'; });
}
function renderFabrics() {
  $('#fabrics').innerHTML = Object.entries(fabrics).map(([id,item]) => `<button class="fabric-card ${id===fabric ? 'selected' : ''}" data-fabric="${id}" aria-pressed="${id===fabric}"><span class="swatch ${id}"></span><span><strong>${item.name}</strong><small>${item.weight} g/m² · ${item.thickness} mm</small></span><span class="radio"></span></button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-fabric]').forEach(button => button.onclick = () => { fabric = button.dataset.fabric as FabricId; renderFabrics(); renderScene(); });
}
function activeMeasurements() { return pattern?.measurements.rows.length ? pattern.measurements : external; }
function renderTables() {
  const measurements = activeMeasurements();
  $('#body-count').textContent = String(measurements?.rows.length ?? 0); $('#variable-count').textContent = String(pattern?.variables.length ?? 0);
  $('#body-tab').classList.toggle('active', tableTab==='body'); $('#variables-tab').classList.toggle('active', tableTab==='variables');
  const rows = tableTab==='body' ? measurements?.rows ?? [] : pattern?.variables ?? [], unit = tableTab==='body' ? measurements?.unit : pattern?.unit;
  $('#table-source').textContent = rows.length ? `${tableTab==='body' ? measurements?.source : 'Pattern inputs'} · ${unit}` : '';
  $('#table-content').innerHTML = rows.length ? `<table><thead><tr><th>${tableTab==='body' ? 'Measurement' : 'Variable'}</th><th>Value</th><th>Formula / description</th></tr></thead><tbody>${rows.map(row => tableRow(row,tableTab==='body' ? unit ?? '' : '')).join('')}</tbody></table>` : `<p class="table-empty">${tableTab==='body' ? 'No body measurements loaded. Open the .smis file used for this pattern, if you have one.' : 'This pattern has no custom variables.'}</p>`;
  $('#measurement-info').innerHTML = measurements ? `<p>${measurements.rows.length} measurements · ${escape(measurements.unit)}<br><span class="muted">${escape(measurements.source)}</span></p>${external && pattern?.measurements.rows.length ? '<p class="field-help">Embedded measurements take priority over the external file.</p>' : ''}` : `<p>${pattern?.measurementPath ? `This pattern references <strong>${escape(pattern.measurementPath)}</strong>. Choose that file to load its measurements.` : 'No embedded body measurements. If your pattern keeps sizing in custom inputs, check Pattern variables below.'}</p>`;
  $('#clear-measurements').hidden = !external;
}
function tableRow(row: Measurement, unit: string) {
  return `<tr><td><strong>${escape(row.label)}</strong><small>${escape(row.name)}</small></td><td class="numeric ${row.error ? 'unresolved' : ''}">${number(row.value)}${row.value!==undefined && unit ? `<span>${escape(unit)}</span>` : ''}</td><td>${escape(row.description||row.formula)}${row.error ? `<small class="error">${escape(row.error)}</small>` : ''}</td></tr>`;
}
function renderDetails() {
  $('#pattern-info').innerHTML = pattern ? `<p>${pattern.pieces.length} pattern templates · ${escape(pattern.unit)}</p><p>${escape(pattern.description)}</p>${pattern.notes ? `<details><summary>Pattern notes</summary><p>${escape(pattern.notes)}</p></details>` : ''}${pattern.warnings.length ? `<div class="callout warning"><strong>${pattern.warnings.length} import notice${pattern.warnings.length===1?'':'s'}</strong><ul>${pattern.warnings.map(w=>`<li>${escape(w)}</li>`).join('')}</ul></div>` : ''}` : '';
  renderFabrics(); renderTables();
}
function openSettings() { const element = $('#settings') as HTMLDetailsElement; element.open = true; $('#settings-toggle').setAttribute('aria-expanded','true'); element.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'start'}); }
function confirmReplacement() { return !hasUnsaved() || confirm('Open another pattern? Your unsaved assembly will be cleared. Cancel to save your progress first.'); }
async function readFile(file: File) { if (file.size>10_000_000) throw new Error('This file is too large. The limit is 10 MB.'); return file.text(); }
function resetPattern(nextSource: string, name: string, isDemo=false) {
  const next = parsePattern(nextSource);
  source = nextSource; filename = name; pattern = next; external = undefined; demo = isDemo;
  assembly = emptyAssembly(); choices = copyChoices(next.pieces); selected=''; step=0; clearDraft(); history.clear(); saved=JSON.stringify(assembly);
  renderedStep = undefined;
  tableTab=next.measurements.rows.length ? 'body' : next.variables.length ? 'variables' : 'body';
  notify(next.warnings.length ? 'The pattern has import notices. Check Pattern details before continuing.' : ''); renderDetails(); render(); scene?.fit();
}
async function loadPattern(file: File) {
  try { if (!confirmReplacement()) return; resetPattern(await readFile(file),file.name); }
  catch(error) { notify((error as Error).message,true); }
}
function saveAssembly() {
  if (!assembly.instances.length) return;
  if (first || second) { notify('Save this seam or cancel the edge selection before saving your assembly.'); return; }
  const blob=new Blob([JSON.stringify(assembly,null,2)],{type:'application/json'}), url=URL.createObjectURL(blob);
  const link=document.createElement('a'); link.href=url; link.download=`${filename.replace(/\.[^.]+$/,'')}.assembly.json`; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  saved=JSON.stringify(assembly); render(); notify('Assembly download started. Keep this file with your pattern and measurements to reopen your work.');
}
function restoreHistory(direction:'undo'|'redo') {
  const entry=history[direction](assembly); if (!entry) return;
  assembly=entry.value; choices=copyChoices(pattern!.pieces,assembly.instances.length ? assembly : undefined); clearDraft(); clampStep(); render(); scene?.fit(); notify(`${direction==='undo'?'Undid':'Redid'}: ${entry.label}.`);
}
function reconcileAssembly() {
  assembly.instances=assembly.instances.filter(i=>pattern!.pieces.some(p=>p.id===i.pieceId));
  const valid=(ref:EdgeRef)=>{const i=assembly.instances.find(i=>i.id===ref.instance);return !!pattern!.pieces.find(p=>p.id===i?.pieceId)?.edges[ref.edge];};
  assembly.seams=assembly.seams.filter(s=>valid(s.a)&&valid(s.b)); choices=copyChoices(pattern!.pieces,assembly.instances.length?assembly:undefined); clearDraft(); history.clear(); clampStep();
}
for (const id of ['#welcome-open','#change-pattern']) $(id).onclick=()=>$('#pattern-file').click();
$('#save-anytime').onclick=saveAssembly; $('#load-assembly').onclick=()=>$('#assembly-file').click();
$('#undo').onclick=()=>restoreHistory('undo'); $('#redo').onclick=()=>restoreHistory('redo');
$('#fit').onclick=()=>scene?.fit();
$('#settings-toggle').onclick=()=> { const settings=$('#settings') as HTMLDetailsElement; if(settings.open) {settings.open=false;$('#settings-toggle').setAttribute('aria-expanded','false');} else openSettings(); };
$('#settings').ontoggle=()=>$('#settings-toggle').setAttribute('aria-expanded',String(($('#settings') as HTMLDetailsElement).open));
$('#load-measurements').onclick=()=>$('#measurement-file').click();
$('#body-tab').onclick=()=>{tableTab='body';renderTables();}; $('#variables-tab').onclick=()=>{tableTab='variables';renderTables();};
document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(button=>button.onclick=()=>scene?.fit(button.dataset.camera as 'front'|'back'|'top'));
($('#pattern-file') as HTMLInputElement).onchange=async event=>{const input=event.target as HTMLInputElement;if(input.files?.[0]) await loadPattern(input.files[0]);input.value='';};
($('#measurement-file') as HTMLInputElement).onchange=async event=>{
  const input=event.target as HTMLInputElement;
  try { if(!input.files?.[0]) return;
    const next=parseMeasurements(await readFile(input.files[0]),input.files[0].name), nextPattern=source?parsePattern(source,next):undefined;
    external=next;if(nextPattern){pattern=nextPattern;reconcileAssembly();}tableTab='body';renderDetails();render();
    notify(next.rows.some(row=>row.error)?'Measurements opened. Some values could not be calculated; see the table.':'Measurements opened. Check your placements and seams if the piece sizes changed.');
  }catch(error){notify((error as Error).message,true);}finally{input.value='';}
};
$('#clear-measurements').onclick=()=>{external=undefined;if(source){pattern=parsePattern(source);reconcileAssembly();}renderDetails();render();};
($('#assembly-file') as HTMLInputElement).onchange=async event=>{
  const input=event.target as HTMLInputElement;
  try { if(!input.files?.[0]||!pattern) return;
    const next=validateAssembly(JSON.parse(await readFile(input.files[0])),pattern.pieces);
    if(hasUnsaved()&&!confirm('Replace the current unsaved assembly with this saved file? Cancel to save your progress first.')) return;
    // Existing version-1 files predate the guided flow; their supplied transforms are already deliberate placements.
    for(const item of next.instances) if(item.arranged===undefined) item.arranged=true;
    assembly=next;choices=copyChoices(pattern.pieces,assembly);selected=assembly.instances[0]?.id??'';clearDraft();history.clear();saved=JSON.stringify(assembly);
    step=canVisit(3,assembly)?3:canVisit(2,assembly)?2:canVisit(1,assembly)?1:0;sewn=true;render();scene?.fit();notify('Saved assembly opened. Continue from the highlighted step.');
  }catch(error){notify((error as Error).message,true);}finally{input.value='';}
};
$('#load-demo').onclick=async()=>{
  if(previewBusy) return;previewBusy=true;
  try {if(!confirmReplacement())return;const response=await fetch('/examples/sleeveless-shell.sm2d');if(!response.ok)throw new Error('The example could not be opened. Try again.');resetPattern(await response.text(),'sleeveless-shell.sm2d',true);}
  catch(error){notify((error as Error).message,true);}finally{previewBusy=false;}
};
$('#welcome').ondragover=event=>event.preventDefault();$('#welcome').ondrop=async event=>{event.preventDefault();if(event.dataTransfer?.files[0])await loadPattern(event.dataTransfer.files[0]);};
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&(first||second||activeSeam)){clearDraft();render();return;}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'&&!(event.target as HTMLElement).closest('input,textarea,select,[contenteditable]')){event.preventDefault();restoreHistory(event.shiftKey?'redo':'undo');}
});
window.addEventListener('beforeunload',event=>{if(hasUnsaved()){event.preventDefault();event.returnValue='';}});
window.addEventListener('pagehide',()=>scene?.dispose());
window.addEventListener('resize',()=>{if(pattern)sizeWorkspace();});
