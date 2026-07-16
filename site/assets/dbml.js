// Native DBML -> SVG entity-relationship diagram renderer. Deliberately not a
// translation into Mermaid's erDiagram grammar: that would lose enums,
// notes, and DBML's own crow's-foot semantics to fit a narrower grammar.
// Instead this parses a practical subset of DBML directly and lays out /
// draws the diagram itself (force-directed layout, hand-drawn crow's-foot
// connectors), so the diagram reflects exactly what was written.
//
// Unsupported by design (documented gap, not silently mis-rendered):
// composite (multi-column) refs/PKs, TableGroup, Project settings, indexes
// (parsed and skipped, never crash the surrounding table), quoted
// identifiers containing spaces.
//
// Entry point: window.DbmlRenderer.render(source, { dark }) -> { svg, width, height }
// Throws Error with a human-readable message on unparseable input.
(function () {
  'use strict';

  // ---- parsing -----------------------------------------------------------

  function stripComments(text) {
    let out = text.replace(/\/\*[\s\S]*?\*\//g, '');
    out = out.split('\n').map((line) => {
      let inStr = false;
      for (let i = 0; i < line.length - 1; i++) {
        const ch = line[i];
        if (ch === "'") inStr = !inStr;
        if (!inStr && ch === '/' && line[i + 1] === '/') return line.slice(0, i);
      }
      return line;
    }).join('\n');
    return out;
  }

  function sanitizeId(name) {
    return String(name).trim().replace(/^["']|["']$/g, '').replace(/[^A-Za-z0-9_]/g, '_') || '_';
  }

  function extractQuoted(s) {
    const m = /'((?:[^'\\]|\\.)*)'/.exec(s);
    return m ? m[1].replace(/\\'/g, "'") : s.replace(/^['"]|['"]$/g, '').trim();
  }

  // Splits a string on top-level commas, respecting nesting of ()/[] and
  // quoted strings — so `default: 'a, b'`, a note containing a comma, or a
  // composite-index tuple don't get split apart. Used both for a column's
  // `[...]` settings list and for splitting several columns crammed onto one
  // physical line (`id int [pk], name varchar`), which DBML allows.
  function splitTopLevel(s) {
    const parts = [];
    let cur = '', depth = 0, inStr = false;
    for (const ch of s) {
      if (ch === "'") inStr = !inStr;
      if (!inStr && (ch === '(' || ch === '[')) depth++;
      if (!inStr && (ch === ')' || ch === ']')) depth--;
      if (!inStr && ch === ',' && depth <= 0) { parts.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }

  function parseColumnSettings(raw) {
    const out = { pk: false, unique: false, notNull: false, note: '', default: '', inlineRef: null };
    if (!raw) return out;
    for (const part of splitTopLevel(raw)) {
      const low = part.toLowerCase();
      if (low === 'pk' || low === 'primary key') out.pk = true;
      else if (low === 'unique') out.unique = true;
      else if (low === 'not null') out.notNull = true;
      else if (/^note:/i.test(part)) out.note = extractQuoted(part.slice(part.indexOf(':') + 1).trim());
      else if (/^default:/i.test(part)) out.default = part.slice(part.indexOf(':') + 1).trim();
      else if (/^ref:/i.test(part)) {
        const m = /^ref:\s*(<>|>|<|-)\s*([\w".]+)\.([\w".]+)/i.exec(part);
        if (m) out.inlineRef = { op: m[1], table: sanitizeId(m[2]), col: sanitizeId(m[3]) };
      }
    }
    return out;
  }

  function parseColumnLine(line) {
    const m = /^"?([A-Za-z_][\w]*)"?\s+([^[\]]+?)(?:\s*\[\s*([^\]]*)\s*\])?\s*$/.exec(line);
    if (!m) return null;
    const settings = parseColumnSettings(m[3]);
    return Object.assign({ name: m[1], type: m[2].trim().replace(/\s+/g, ' ') }, settings);
  }

  function parseRelExpr(expr) {
    const m = /^([\w".]+)\.([\w".]+)\s*(<>|>|<|-)\s*([\w".]+)\.([\w".]+)$/.exec(expr.trim());
    if (!m) return null;
    return {
      fromTable: sanitizeId(m[1]), fromCol: m[2].replace(/^["']|["']$/g, ''),
      op: m[3],
      toTable: sanitizeId(m[4]), toCol: m[5].replace(/^["']|["']$/g, ''),
    };
  }

  // Annotates each line with the brace-nesting depth in effect *before* and
  // *after* it, in one pass. Structural parsing below reads off these depths
  // instead of hand-tracking counters at every call site (error-prone once
  // nesting is more than one level, e.g. `indexes { ... }` inside a table).
  function annotateDepths(lines) {
    let depth = 0;
    return lines.map((line) => {
      const depthBefore = depth;
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      depth += opens - closes;
      return { line, depthBefore, depthAfter: depth };
    });
  }

  // Given the index of a line whose depthAfter > depthBefore (it opened a
  // block), returns the block's direct-child lines (depthBefore === baseDepth
  // + 1 — nested sub-blocks are transparently skipped, not returned) and the
  // index of the line where the block closes back to baseDepth.
  function blockBody(A, startIdx) {
    const baseDepth = A[startIdx].depthBefore;
    if (A[startIdx].depthAfter <= baseDepth) return { body: [], endIdx: startIdx };
    let j = startIdx + 1;
    while (j < A.length && A[j].depthAfter > baseDepth) j++;
    const body = [];
    // Exclusive of j itself: that's the line where depth returns to
    // baseDepth, i.e. the block's closing brace, not a body line.
    for (let k = startIdx + 1; k < j && k < A.length; k++) {
      if (A[k].depthBefore === baseDepth + 1) body.push(A[k].line.trim());
    }
    return { body, endIdx: j };
  }

  function uniqueId(base, existing) {
    const used = new Set(existing.map((x) => x.id));
    let name = base, n = 2;
    while (used.has(name)) name = base + '_' + (n++);
    return name;
  }

  // For a block fully written on one physical line (`Table x { id int [pk] }`),
  // blockBody() sees depth return to baseline on the same line and has no
  // separate "body lines" to hand back. This pulls the `{ ... }` interior out
  // as a single string instead, which the caller then still runs through
  // splitTopLevel() to find individual columns/values/refs within it.
  function inlineBlockContent(line) {
    const start = line.indexOf('{');
    const end = line.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    return line.slice(start + 1, end).trim();
  }

  // Body lines from blockBody() are already newline-separated; each one may
  // itself hold several comma-separated columns/values/refs (or, for a
  // fully single-line block, the whole interior is one such string). This
  // normalizes both shapes into a flat list of individual chunks to parse.
  function chunksFromBody(A, idx) {
    if (A[idx].depthAfter <= A[idx].depthBefore) {
      const content = inlineBlockContent(A[idx].line);
      return { chunks: content ? splitTopLevel(content) : [], endIdx: idx };
    }
    const { body, endIdx } = blockBody(A, idx);
    const chunks = [];
    for (const bline of body) {
      if (!bline || /\{\s*$/.test(bline)) continue; // nested block opener (indexes, ...)
      chunks.push(...splitTopLevel(bline));
    }
    return { chunks, endIdx };
  }

  function parseDbml(source) {
    const lines = stripComments(source).split('\n');
    const A = annotateDepths(lines);
    const tables = [], enums = [], refs = [];
    let idx = 0;

    while (idx < A.length) {
      const { depthBefore } = A[idx];
      const trimmed = A[idx].line.trim();
      if (!trimmed || depthBefore !== 0) { idx++; continue; }

      let m;
      if ((m = /^Table\s+"?([\w.]+)"?(?:\s+as\s+"?[\w]+"?)?\s*\{/i.exec(trimmed))) {
        const { chunks, endIdx } = chunksFromBody(A, idx);
        const table = { id: uniqueId(sanitizeId(m[1]), tables), name: m[1], note: '', columns: [] };
        for (const piece of chunks) {
          if (!piece || /\{\s*$/.test(piece)) continue; // nested block opener (indexes, ...)
          const noteM = /^Note:\s*(.+)$/i.exec(piece);
          if (noteM) { table.note = extractQuoted(noteM[1]); continue; }
          const col = parseColumnLine(piece);
          if (col) table.columns.push(col);
        }
        tables.push(table);
        idx = endIdx + 1;
        continue;
      }

      if ((m = /^Enum\s+"?([\w.]+)"?\s*\{/i.exec(trimmed))) {
        const { chunks, endIdx } = chunksFromBody(A, idx);
        const en = { id: uniqueId(sanitizeId(m[1]), enums), name: m[1], values: [] };
        for (const piece of chunks) {
          if (!piece || /\{\s*$/.test(piece)) continue;
          const vm = /^"?([^"[]+?)"?\s*(?:\[[^\]]*\])?\s*$/.exec(piece);
          if (vm && vm[1].trim()) en.values.push(vm[1].trim());
        }
        enums.push(en);
        idx = endIdx + 1;
        continue;
      }

      if ((m = /^Ref\b[^:{]*:\s*(.+)$/i.exec(trimmed))) {
        const rel = parseRelExpr(m[1]);
        if (rel) refs.push(rel);
        idx++;
        continue;
      }

      if (/^Ref\b/i.test(trimmed) && /\{/.test(trimmed)) {
        const { chunks, endIdx } = chunksFromBody(A, idx);
        for (const piece of chunks) {
          const rel = parseRelExpr(piece);
          if (rel) refs.push(rel);
        }
        idx = endIdx + 1;
        continue;
      }

      if (/\{/.test(trimmed)) {
        // Unrecognized top-level construct (TableGroup, Project, a standalone
        // Note block, ...) — skip its whole span rather than mis-parsing it.
        const { endIdx } = blockBody(A, idx);
        idx = endIdx + 1;
        continue;
      }

      idx++; // stray/unsupported top-level line — ignore
    }

    const tableById = new Map(tables.map((t) => [t.id, t]));
    // A column's inline `[ref: > other.col]` setting is equivalent to a
    // top-level `Ref:` between this column and the target.
    for (const t of tables) {
      for (const c of t.columns) {
        if (c.inlineRef) {
          refs.push({ fromTable: t.id, fromCol: c.name, op: c.inlineRef.op, toTable: c.inlineRef.table, toCol: c.inlineRef.col });
        }
      }
    }
    // Resolve ref table references (which may use raw names rather than the
    // deduped `id`) against the tables we actually parsed; drop refs to
    // tables that don't exist rather than crash the whole diagram.
    const byName = new Map(tables.map((t) => [sanitizeId(t.name), t.id]));
    const resolvedRefs = [];
    for (const r of refs) {
      const fromId = tableById.has(r.fromTable) ? r.fromTable : byName.get(r.fromTable);
      const toId = tableById.has(r.toTable) ? r.toTable : byName.get(r.toTable);
      if (fromId && toId) resolvedRefs.push(Object.assign({}, r, { fromTable: fromId, toTable: toId }));
    }

    if (!tables.length) throw new Error('No tables found — expected at least one `Table name { ... }` block.');
    return { tables, enums, refs: resolvedRefs };
  }

  // ---- layout (layered/Sugiyama-lite — deterministic, "autocompact"-style) --
  //
  // Earlier versions used a force-directed (Fruchterman-Reingold) simulation
  // with randomized starting positions. That produces a different, sometimes
  // overlapping or crossing-heavy layout on every render of the same source,
  // which reads as broken next to dbdiagram.io's deterministic auto-layout.
  // This instead buckets tables into columns by BFS distance from a low-degree
  // seed (so a chain like follows–users–posts fans out into three columns
  // instead of collapsing users' two neighbors into one), orders each column
  // with a barycenter pass to reduce edge crossings, then stacks/spaces
  // columns by actual box size — no overlap is possible by construction.

  const COL_GAP = 90, ROW_GAP = 40;

  // Standard Sugiyama layer-ordering heuristic: alternate forward/backward
  // passes, each re-sorting a column by the average position its neighbors
  // hold in the already-fixed adjacent column. A few passes are plenty at
  // ER-diagram scale — this isn't optimal crossing minimization, just enough
  // to stop obviously-avoidable crossings.
  function orderColumns(columns, adj) {
    for (let pass = 0; pass < 4; pass++) {
      const forward = pass % 2 === 0;
      const range = [];
      if (forward) { for (let i = 1; i < columns.length; i++) range.push(i); }
      else { for (let i = columns.length - 2; i >= 0; i--) range.push(i); }
      for (const ci of range) {
        const refCol = columns[forward ? ci - 1 : ci + 1];
        if (!refCol) continue;
        const refIndex = new Map(refCol.map((id, i) => [id, i]));
        const scored = columns[ci].map((id, i) => {
          const neighbors = [...adj.get(id)].filter((nb) => refIndex.has(nb));
          const score = neighbors.length
            ? neighbors.reduce((s, nb) => s + refIndex.get(nb), 0) / neighbors.length
            : Number.MAX_SAFE_INTEGER;
          return { id, score, i };
        });
        scored.sort((a, b) => a.score - b.score || a.i - b.i);
        columns[ci] = scored.map((s) => s.id);
      }
    }
  }

  function layoutGraph(nodes, edges) {
    const pos = new Map();
    const nodeById = new Map(nodes.map((nd) => [nd.id, nd]));
    const adj = new Map(nodes.map((nd) => [nd.id, new Set()]));
    for (const e of edges) {
      if (!adj.has(e.source) || !adj.has(e.target) || e.source === e.target) continue;
      adj.get(e.source).add(e.target);
      adj.get(e.target).add(e.source);
    }

    // 1. Split into connected components, and within each assign every node
    // a layer = BFS distance from a minimum-degree seed. Seeding from a leaf
    // (rather than the highest-degree hub) is what turns a simple chain into
    // separate columns instead of stacking a hub's neighbors into one.
    const layerOf = new Map();
    const visited = new Set();
    const seeds = nodes.slice().sort((a, b) => adj.get(a.id).size - adj.get(b.id).size);
    const components = [];
    for (const seed of seeds) {
      if (visited.has(seed.id)) continue;
      const nodeIds = [seed.id];
      visited.add(seed.id);
      layerOf.set(seed.id, 0);
      let frontier = [seed.id];
      let maxLayer = 0;
      while (frontier.length) {
        const next = [];
        for (const cur of frontier) {
          for (const nb of adj.get(cur)) {
            if (visited.has(nb)) continue;
            visited.add(nb);
            const l = layerOf.get(cur) + 1;
            layerOf.set(nb, l);
            maxLayer = Math.max(maxLayer, l);
            nodeIds.push(nb);
            next.push(nb);
          }
        }
        frontier = next;
      }
      components.push({ nodeIds, maxLayer });
    }

    // 2. Lay out each component's columns left to right, then place
    // components side by side. Column width = its widest node; column
    // height = sum of its nodes' heights + gaps. Columns within a component
    // are top-aligned (all start at the same y) rather than centered, so
    // every table originates from the same horizontal row and grows
    // downward by however many columns/rows it has.
    let originX = 0;
    for (const comp of components) {
      const columns = [];
      for (const id of comp.nodeIds) {
        const l = layerOf.get(id);
        (columns[l] = columns[l] || []).push(id);
      }
      orderColumns(columns, adj);

      const colWidths = columns.map((col) => Math.max(...col.map((id) => nodeById.get(id).width)));

      let colX = originX;
      columns.forEach((col, ci) => {
        const x = colX + colWidths[ci] / 2;
        let y = 0;
        for (const id of col) {
          const node = nodeById.get(id);
          pos.set(id, { x, y: y + node.height / 2 });
          y += node.height + ROW_GAP;
        }
        colX += colWidths[ci] + COL_GAP;
      });
      originX = colX + COL_GAP;
    }

    return pos;
  }

  // ---- box sizing ----------------------------------------------------------

  const ROW_H = 20, HEADER_H = 28, PAD_X = 10, NOTE_H = 16;
  let measureCtx = null;

  function textWidth(text, px, weight) {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = `${weight || 400} ${px}px ui-sans-serif, system-ui, sans-serif`;
    return measureCtx.measureText(text).width;
  }

  function badgeFor(col, isFk) {
    const tags = [];
    if (col.pk) tags.push('PK');
    if (isFk) tags.push('FK');
    if (col.unique && !col.pk) tags.push('UK');
    return tags.join(' ');
  }

  function buildTableNode(table, fkColumns) {
    const rows = table.columns.map((c) => {
      const isFk = fkColumns.has(table.id + '.' + c.name);
      const badge = badgeFor(c, isFk);
      const rowWidth = PAD_X + textWidth(c.name, 12, 600) + 14 + textWidth(c.type, 12) + (badge ? 10 + textWidth(badge, 10, 700) : 0) + PAD_X;
      return { name: c.name, type: c.type, badge, isFk, pk: c.pk, note: c.note, default: c.default, width: rowWidth };
    });
    const headerWidth = PAD_X * 2 + textWidth(table.name, 13, 700);
    const width = Math.max(150, headerWidth, ...rows.map((r) => r.width), 0);
    const height = HEADER_H + rows.length * ROW_H + (table.note ? NOTE_H : 4);
    return { id: table.id, name: table.name, note: table.note, kind: 'table', rows, width, height };
  }

  function buildEnumNode(en) {
    const rows = en.values.map((v) => ({ name: v, width: PAD_X * 2 + textWidth(v, 12) }));
    const headerWidth = PAD_X * 2 + textWidth(en.name, 13, 700);
    const width = Math.max(120, headerWidth, ...rows.map((r) => r.width), 0);
    const height = HEADER_H + rows.length * ROW_H + 4;
    return { id: en.id, name: en.name, kind: 'enum', rows, width, height };
  }

  // ---- SVG drawing -----------------------------------------------------

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, text) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  function colors(dark) {
    return dark
      ? { tableBg: '#262626', tableHeader: '#3b82f6', enumHeader: '#a855f7', border: '#525252', text: '#e5e5e5', muted: '#a3a3a3', pk: '#facc15', line: '#a3a3a3', headerText: '#fff' }
      : { tableBg: '#ffffff', tableHeader: '#2563eb', enumHeader: '#9333ea', border: '#d4d4d4', text: '#262626', muted: '#737373', pk: '#b45309', line: '#737373', headerText: '#fff' };
  }

  function drawNode(g, node, pos, c) {
    const x = pos.x - node.width / 2, y = pos.y - node.height / 2;
    const headerColor = node.kind === 'enum' ? c.enumHeader : c.tableHeader;
    const box = el('g', { 'data-id': node.id });
    box.appendChild(el('rect', { x, y, width: node.width, height: node.height, rx: 6, fill: c.tableBg, stroke: c.border, 'stroke-width': 1 }));
    box.appendChild(el('rect', { x, y, width: node.width, height: HEADER_H, rx: 6, fill: headerColor }));
    box.appendChild(el('rect', { x, y: y + HEADER_H - 6, width: node.width, height: 6, fill: headerColor }));
    box.appendChild(el('text', { x: x + PAD_X, y: y + HEADER_H / 2 + 4, fill: c.headerText, 'font-size': 13, 'font-weight': 700 }, node.name));
    if (node.note) box.appendChild(el('title', {}, node.note));

    node.rows.forEach((r, i) => {
      const ry = y + HEADER_H + i * ROW_H;
      if (i % 2 === 1) box.appendChild(el('rect', { x, y: ry, width: node.width, height: ROW_H, fill: 'transparent', opacity: 0.03 }));
      const nameEl = el('text', { x: x + PAD_X, y: ry + ROW_H / 2 + 4, fill: r.pk ? c.pk : c.text, 'font-size': 12, 'font-weight': r.pk || r.isFk ? 600 : 400 }, r.name);
      box.appendChild(nameEl);
      if (r.type != null) {
        box.appendChild(el('text', { x: x + node.width - PAD_X, y: ry + ROW_H / 2 + 4, fill: c.muted, 'font-size': 11, 'text-anchor': 'end' }, r.badge ? `${r.type}  ${r.badge}` : r.type));
      }
      const titleParts = [r.note, r.default ? `default: ${r.default}` : ''].filter(Boolean);
      if (titleParts.length) {
        const t = el('title', {}, titleParts.join(' — '));
        nameEl.appendChild(t);
      }
    });

    g.appendChild(box);
  }

  function attachSide(a, b) { return a.x <= b.x ? 'right' : 'left'; }

  function rowIndex(node, colName) {
    const i = node.rows.findIndex((r) => r.name === colName);
    return i === -1 ? 0 : i;
  }

  function attachPoint(node, pos, colIndex, side) {
    const x = pos.x - node.width / 2, y = pos.y - node.height / 2;
    return {
      x: side === 'right' ? x + node.width : x,
      y: y + HEADER_H + colIndex * ROW_H + ROW_H / 2,
    };
  }

  function drawMarker(g, p, dir, kind, stroke) {
    if (kind === 'one') {
      [7, 13].forEach((off) => {
        const lx = p.x - dir * off;
        g.appendChild(el('line', { x1: lx, y1: p.y - 6, x2: lx, y2: p.y + 6, stroke, 'stroke-width': 1.5 }));
      });
    } else {
      const back = { x: p.x - dir * 16, y: p.y };
      [-7, 0, 7].forEach((oy) => {
        g.appendChild(el('line', { x1: back.x, y1: back.y + oy, x2: p.x, y2: p.y, stroke, 'stroke-width': 1.5 }));
      });
    }
  }

  function drawRef(g, ref, srcNode, tgtNode, srcPos, tgtPos, c) {
    const srcSide = attachSide(srcPos, tgtPos);
    const tgtSide = srcSide === 'right' ? 'left' : 'right';
    const srcPt = attachPoint(srcNode, srcPos, rowIndex(srcNode, ref.fromCol), srcSide);
    const tgtPt = attachPoint(tgtNode, tgtPos, rowIndex(tgtNode, ref.toCol), tgtSide);
    const midX = (srcPt.x + tgtPt.x) / 2;
    const d = `M ${srcPt.x} ${srcPt.y} H ${midX} V ${tgtPt.y} H ${tgtPt.x}`;
    g.appendChild(el('path', { d, fill: 'none', stroke: c.line, 'stroke-width': 1.5 }));

    const srcDir = srcSide === 'left' ? 1 : -1;
    const tgtDir = tgtSide === 'left' ? 1 : -1;
    const srcKind = ref.op === '>' || ref.op === '<>' ? 'many' : 'one';
    const tgtKind = ref.op === '<' || ref.op === '<>' ? 'many' : 'one';
    drawMarker(g, srcPt, srcDir, srcKind, c.line);
    drawMarker(g, tgtPt, tgtDir, tgtKind, c.line);
  }

  function render(source, opts) {
    opts = opts || {};
    const parsed = parseDbml(source);
    // The FK lives on the "many" side of the ref. For `>` (and the
    // ambiguous `-`/`<>` cases) that's the from-side; `<` reverses it
    // (`one.col < many.col`), so the to-side is the one that's actually FK.
    const fkColumns = new Set(parsed.refs.map((r) =>
      r.op === '<' ? r.toTable + '.' + r.toCol : r.fromTable + '.' + r.fromCol));

    const tableNodes = parsed.tables.map((t) => buildTableNode(t, fkColumns));
    const enumNodes = parsed.enums.map((e) => buildEnumNode(e));
    const nodes = tableNodes.concat(enumNodes);
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    const edges = parsed.refs
      .filter((r) => nodeById.has(r.fromTable) && nodeById.has(r.toTable))
      .map((r) => ({ source: r.fromTable, target: r.toTable }));
    // Layout-only link between a table and an enum type its column uses, so
    // the enum lands in its own column near its users without drawing a
    // line for it (DBML doesn't model enum usage as a Ref).
    const enumByName = new Map(parsed.enums.map((e) => [e.name, e.id]));
    for (const t of parsed.tables) {
      for (const c of t.columns) {
        const eid = enumByName.get(c.type);
        if (eid) edges.push({ source: t.id, target: eid });
      }
    }

    const pos = layoutGraph(nodes, edges);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      const p = pos.get(n.id);
      minX = Math.min(minX, p.x - n.width / 2);
      minY = Math.min(minY, p.y - n.height / 2);
      maxX = Math.max(maxX, p.x + n.width / 2);
      maxY = Math.max(maxY, p.y + n.height / 2);
    }
    const PAD = 24;
    for (const n of nodes) {
      const p = pos.get(n.id);
      p.x += PAD - minX;
      p.y += PAD - minY;
    }
    const width = Math.ceil(maxX - minX) + PAD * 2;
    const height = Math.ceil(maxY - minY) + PAD * 2;

    const c = colors(!!opts.dark);
    const svg = el('svg', { xmlns: SVG_NS, viewBox: `0 0 ${width} ${height}`, width, height, 'font-family': 'ui-sans-serif, system-ui, sans-serif' });
    const edgeLayer = el('g', { class: 'dbml-edges' });
    const nodeLayer = el('g', { class: 'dbml-nodes' });
    svg.appendChild(edgeLayer);
    svg.appendChild(nodeLayer);

    for (const ref of parsed.refs) {
      const srcNode = nodeById.get(ref.fromTable), tgtNode = nodeById.get(ref.toTable);
      if (!srcNode || !tgtNode) continue;
      drawRef(edgeLayer, ref, srcNode, tgtNode, pos.get(srcNode.id), pos.get(tgtNode.id), c);
    }
    for (const n of nodes) drawNode(nodeLayer, n, pos.get(n.id), c);

    return { svg: new XMLSerializer().serializeToString(svg), width, height };
  }

  window.DbmlRenderer = { render, parseDbml };
})();
