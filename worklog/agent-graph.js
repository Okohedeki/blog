/* Render a privacy-safe, flat audit snapshot as an interactive work trace. */
(function () {
  "use strict";

  var data = window.AGENT_WORK_DATA;
  var stage = document.getElementById("agent-graph-stage");
  var svg = document.getElementById("agent-work-graph");
  var viewport = document.getElementById("agent-graph-viewport");
  var tooltip = document.getElementById("agent-graph-tooltip");
  var detailTitle = document.getElementById("agent-detail-title");
  var detailDescription = document.getElementById("agent-detail-description");
  var detailMetadata = document.getElementById("agent-detail-metadata");
  var detailKicker = document.querySelector("#agent-graph-detail .detail-kicker");
  if (!data || !stage || !svg || !viewport || !tooltip || !detailTitle || !detailDescription || !detailMetadata) return;

  var NS = "http://www.w3.org/2000/svg";
  var defaultModel = data.provenance && data.provenance.models ? data.provenance.models.join(", ") : "not retained";
  var parentFromEdges = new Map((data.edges || []).map(function (edge) { return [edge.target, edge.source]; }));
  var nodes = data.nodes.map(function (node) {
    var type = node.type || (node.kind === "subagent" ? "subagent" : "reasoning");
    var role = node.role || (node.kind === "main" ? "coordinator" : node.kind === "task" ? "workstream" : "delegate");
    return {
      id: node.id,
      type: type,
      parentId: node.parentId || parentFromEdges.get(node.id) || null,
      label: node.label,
      role: role,
      description: node.description || node.summary || node.detail || "No public summary retained.",
      metadata: Object.assign({
        tokens: node.tokens == null ? null : node.tokens,
        model: defaultModel,
        startedAt: node.time || null,
        duration: null,
        status: node.status || "unknown"
      }, node.metadata || {})
    };
  });
  var nodeById = new Map(nodes.map(function (node) { return [node.id, node]; }));
  var childrenByParent = new Map();
  nodes.forEach(function (node) {
    if (!node.parentId) return;
    if (!childrenByParent.has(node.parentId)) childrenByParent.set(node.parentId, []);
    childrenByParent.get(node.parentId).push(node);
  });

  var root = nodes.find(function (node) { return !node.parentId; });
  if (!root) return;

  var collapsed = new Set();
  var selectedId = root.id;
  var transform = { x: 0, y: 0, k: 0.92 };
  var drag = null;

  function create(name, attrs, text) {
    var element = document.createElementNS(NS, name);
    Object.entries(attrs || {}).forEach(function (entry) { element.setAttribute(entry[0], entry[1]); });
    if (text != null) element.textContent = text;
    return element;
  }

  function tokenLabel(value, compact) {
    if (value == null) return "not retained";
    if (compact) return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
    return new Intl.NumberFormat("en").format(value) + " tokens";
  }

  function typeLabel(node) {
    if (node.type === "subagent") return "Delegated subchain";
    return node.role === "coordinator" ? "Main reasoning chain" : "Reasoning workstream";
  }

  function applyTransform() {
    viewport.setAttribute("transform", "translate(" + transform.x + " " + transform.y + ") scale(" + transform.k + ")");
  }

  function metadataRow(label, value) {
    var wrapper = document.createElement("div");
    var term = document.createElement("dt");
    var description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value == null || value === "" ? "not retained" : String(value);
    wrapper.appendChild(term);
    wrapper.appendChild(description);
    return wrapper;
  }

  function selectNode(node) {
    selectedId = node.id;
    detailKicker.textContent = typeLabel(node);
    detailTitle.textContent = node.label;
    detailDescription.textContent = node.description;
    detailMetadata.replaceChildren(
      metadataRow("Type", node.type),
      metadataRow("Parent", node.parentId && nodeById.get(node.parentId) ? nodeById.get(node.parentId).label : "—"),
      metadataRow("Status", node.metadata.status),
      metadataRow("Started", node.metadata.startedAt),
      metadataRow("Duration", node.metadata.duration),
      metadataRow("Model", node.metadata.model),
      metadataRow("Usage", tokenLabel(node.metadata.tokens, false))
    );
  }

  function graphPositions() {
    var positions = new Map();
    var workstreams = childrenByParent.get(root.id) || [];
    var columnGap = 170;
    var firstX = 125;
    var rootX = firstX + ((Math.max(workstreams.length, 1) - 1) * columnGap) / 2;
    positions.set(root.id, { x: rootX, y: 70 });

    workstreams.forEach(function (workstream, index) {
      var x = firstX + index * columnGap;
      positions.set(workstream.id, { x: x, y: 210 });
      if (collapsed.has(workstream.id)) return;
      var children = childrenByParent.get(workstream.id) || [];
      children.forEach(function (child, childIndex) {
        positions.set(child.id, { x: x, y: 340 + childIndex * 78 });
      });
    });

    if (!collapsed.has(root.id)) return positions;
    return new Map([[root.id, positions.get(root.id)]]);
  }

  function showTooltip(mark, node) {
    tooltip.replaceChildren();
    var strong = document.createElement("strong");
    var span = document.createElement("span");
    strong.textContent = node.label;
    span.textContent = typeLabel(node) + " · " + tokenLabel(node.metadata.tokens, true);
    tooltip.appendChild(strong);
    tooltip.appendChild(span);
    tooltip.hidden = false;
    var markBox = mark.getBoundingClientRect();
    var hostBox = stage.getBoundingClientRect();
    tooltip.style.left = Math.min(hostBox.width - tooltip.offsetWidth - 8, Math.max(8, markBox.right - hostBox.left + 8)) + "px";
    tooltip.style.top = Math.max(8, markBox.top - hostBox.top - tooltip.offsetHeight - 5) + "px";
  }

  function addNode(node, position) {
    var group = create("g");
    var mark;
    var hasChildren = (childrenByParent.get(node.id) || []).length > 0;
    if (node.type === "reasoning") {
      var width = node.role === "coordinator" ? 180 : 136;
      mark = create("rect", {
        x: position.x - width / 2,
        y: position.y - 24,
        width: width,
        height: 48,
        rx: 8,
        class: "agent-node reasoning" + (collapsed.has(node.id) ? " is-collapsed" : "")
      });
      group.appendChild(mark);
      group.appendChild(create("text", { x: position.x, y: position.y - 2, class: "agent-node-label" }, node.label));
      group.appendChild(create("text", { x: position.x, y: position.y + 14, class: "agent-node-meta" }, tokenLabel(node.metadata.tokens, true) + (hasChildren ? " · " + (collapsed.has(node.id) ? "+" : "−") : "")));
    } else {
      mark = create("circle", { cx: position.x, cy: position.y, r: 11, class: "agent-node subagent" });
      group.appendChild(mark);
      group.appendChild(create("text", { x: position.x, y: position.y + 27, class: "agent-node-label" }, node.label));
      group.appendChild(create("text", { x: position.x, y: position.y + 41, class: "agent-node-meta" }, tokenLabel(node.metadata.tokens, true)));
    }

    if (node.id === selectedId) mark.classList.add("is-selected");
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-label", node.label + ", " + typeLabel(node) + ", " + tokenLabel(node.metadata.tokens, false));

    function activate() {
      selectNode(node);
      if (node.type === "reasoning" && hasChildren) {
        if (collapsed.has(node.id)) collapsed.delete(node.id);
        else collapsed.add(node.id);
      }
      render();
    }

    mark.addEventListener("mouseenter", function () { showTooltip(mark, node); });
    mark.addEventListener("mouseleave", function () { tooltip.hidden = true; });
    mark.addEventListener("click", activate);
    mark.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
    viewport.appendChild(group);
  }

  function render() {
    viewport.replaceChildren();
    var positions = graphPositions();

    (data.edges || []).forEach(function (edge) {
      var source = positions.get(edge.source);
      var target = positions.get(edge.target);
      if (!source || !target) return;
      var middle = (source.y + target.y) / 2;
      viewport.appendChild(create("path", {
        d: "M" + source.x + "," + (source.y + 24) + " C" + source.x + "," + middle + " " + target.x + "," + middle + " " + target.x + "," + (target.y - 16),
        class: "agent-edge " + (edge.kind || edge.type || "delegation")
      }));
    });

    nodes.forEach(function (node) {
      var position = positions.get(node.id);
      if (position) addNode(node, position);
    });
    applyTransform();
  }

  function fitGraph() {
    var width = svg.viewBox.baseVal.width;
    var workstreamCount = (childrenByParent.get(root.id) || []).length;
    var contentWidth = Math.max(1100, 250 + Math.max(0, workstreamCount - 1) * 170);
    transform.k = Math.min(1, width / contentWidth) * 0.95;
    transform.x = (width - contentWidth * transform.k) / 2;
    transform.y = 12;
    applyTransform();
  }

  stage.addEventListener("wheel", function (event) {
    event.preventDefault();
    transform.k = Math.max(0.38, Math.min(2.6, transform.k * (event.deltaY < 0 ? 1.08 : 1 / 1.08)));
    applyTransform();
  }, { passive: false });

  stage.addEventListener("pointerdown", function (event) {
    if (event.target.classList.contains("agent-node")) return;
    var unitX = svg.viewBox.baseVal.width / svg.clientWidth;
    var unitY = svg.viewBox.baseVal.height / svg.clientHeight;
    drag = { x: event.clientX * unitX - transform.x, y: event.clientY * unitY - transform.y };
    stage.classList.add("is-dragging");
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", function (event) {
    if (!drag) return;
    var unitX = svg.viewBox.baseVal.width / svg.clientWidth;
    var unitY = svg.viewBox.baseVal.height / svg.clientHeight;
    transform.x = event.clientX * unitX - drag.x;
    transform.y = event.clientY * unitY - drag.y;
    applyTransform();
  });

  function endDrag() {
    drag = null;
    stage.classList.remove("is-dragging");
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  document.getElementById("agent-day").addEventListener("toggle", function (event) {
    if (event.currentTarget.open) window.requestAnimationFrame(fitGraph);
  });

  selectNode(root);
  render();
  fitGraph();
}());
