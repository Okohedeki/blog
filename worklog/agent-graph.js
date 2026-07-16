/* Render the committed daily snapshot as a readable delegation tree. */
(function () {
  "use strict";

  var data = window.AGENT_WORK_DATA;
  var stage = document.getElementById("agent-graph-stage");
  var svg = document.getElementById("agent-work-graph");
  var viewport = document.getElementById("agent-graph-viewport");
  var detail = document.getElementById("agent-graph-detail");
  var detailTable = detail && detail.querySelector(".agent-detail-table");
  var detailRows = detailTable && detailTable.querySelector("tbody");
  var tooltip = document.getElementById("agent-graph-tooltip");
  if (!data || !stage || !svg || !viewport || !detail || !detailTable || !detailRows || !tooltip) return;

  var NS = "http://www.w3.org/2000/svg";
  var nodeById = new Map(data.nodes.map(function (node) { return [node.id, node]; }));
  var parentByChild = new Map(data.edges.map(function (edge) { return [edge.target, edge.source]; }));
  var transform = { x: 0, y: 0, k: 0.92 };
  var drag = null;

  function create(name, attrs, text) {
    var element = document.createElementNS(NS, name);
    Object.entries(attrs || {}).forEach(function (entry) { element.setAttribute(entry[0], entry[1]); });
    if (text) element.textContent = text;
    return element;
  }

  function safe(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character];
    });
  }

  function tokens(value) {
    return value == null ? "Usage unavailable" : new Intl.NumberFormat().format(value) + " observed tokens";
  }

  function kindLabel(kind) {
    return { main: "Coordinator", task: "Workstream", subagent: "Subagent" }[kind] || kind;
  }

  function conversationSummary(node) {
    return String(node.summary || node.detail || "No summary published.").replace(/\s+/g, " ").trim();
  }

  function applyTransform() {
    viewport.setAttribute("transform", "translate(" + transform.x + " " + transform.y + ") scale(" + transform.k + ")");
  }

  function select(mark, node) {
    viewport.querySelectorAll(".agent-node.is-selected").forEach(function (item) { item.classList.remove("is-selected"); });
    mark.classList.add("is-selected");
    var parent = nodeById.get(parentByChild.get(node.id));
    var rows = [
      ["Conversation", node.label],
      ["Node ID", node.id],
      ["Type", kindLabel(node.kind)],
      ["Parent", parent ? parent.label : "—"],
      ["Status", node.status || "Unknown"],
      ["Started", node.time || "Unknown"],
      ["Usage", tokens(node.tokens)],
      ["Summary", conversationSummary(node)]
    ];
    detailRows.innerHTML = rows.map(function (row) {
      return "<tr><th scope=\"row\">" + safe(row[0]) + "</th><td>" + safe(row[1]) + "</td></tr>";
    }).join("");
    detailTable.hidden = false;
  }

  function addNode(node, x, y) {
    var group = create("g");
    var mark;
    if (node.kind === "task") {
      mark = create("rect", { x: x - 10, y: y - 10, width: 20, height: 20, transform: "rotate(45 " + x + " " + y + ")", rx: 2, class: "agent-node task" });
    } else {
      var radius = node.kind === "main" ? 17 : Math.max(7, Math.min(14, node.radius || 9));
      mark = create("circle", { cx: x, cy: y, r: radius, class: "agent-node " + node.kind });
    }
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-label", node.label + ", " + kindLabel(node.kind) + ", " + tokens(node.tokens));
    group.appendChild(mark);
    group.appendChild(create("text", { x: x + 21, y: y + 4, class: "agent-node-label" }, node.label));
    viewport.appendChild(group);

    mark.addEventListener("mouseenter", function () {
      tooltip.innerHTML = "<strong>" + safe(node.label) + "</strong><span>" + safe(kindLabel(node.kind)) + " · " + safe(node.status || "unknown") + "</span>";
      tooltip.hidden = false;
      var markBox = mark.getBoundingClientRect();
      var hostBox = stage.getBoundingClientRect();
      tooltip.style.left = Math.min(hostBox.width - tooltip.offsetWidth - 8, Math.max(8, markBox.right - hostBox.left + 8)) + "px";
      tooltip.style.top = Math.max(8, markBox.top - hostBox.top - tooltip.offsetHeight - 5) + "px";
    });
    mark.addEventListener("mouseleave", function () { tooltip.hidden = true; });
    mark.addEventListener("click", function () { select(mark, node); });
    mark.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(mark, node); }
    });
    return { x: x, y: y };
  }

  var root = data.nodes.find(function (node) { return node.kind === "main"; });
  var tasks = data.nodes.filter(function (node) { return node.kind === "task"; });
  var positions = new Map();
  var rootPosition = { x: 105, y: data.height / 2 };
  positions.set(root.id, rootPosition);
  var taskX = 340;
  var agentX = 620;
  var taskSpacing = (data.height - 130) / Math.max(1, tasks.length - 1);

  tasks.forEach(function (task, taskIndex) {
    var taskY = 65 + taskIndex * taskSpacing;
    positions.set(task.id, { x: taskX, y: taskY });
    var children = data.edges.filter(function (edge) { return edge.source === task.id; }).map(function (edge) { return nodeById.get(edge.target); }).filter(Boolean);
    var gap = 27;
    var startY = taskY - ((children.length - 1) * gap) / 2;
    children.forEach(function (child, childIndex) {
      positions.set(child.id, { x: agentX, y: startY + childIndex * gap });
    });
  });

  data.edges.forEach(function (edge) {
    var source = positions.get(edge.source);
    var target = positions.get(edge.target);
    if (!source || !target) return;
    var middle = (source.x + target.x) / 2;
    viewport.appendChild(create("path", {
      d: "M" + source.x + "," + source.y + " C" + middle + "," + source.y + " " + middle + "," + target.y + " " + target.x + "," + target.y,
      class: "agent-edge " + edge.kind
    }));
  });

  tasks.forEach(function (task, index) {
    var position = positions.get(task.id);
    viewport.appendChild(create("line", { x1: 250, y1: position.y, x2: 960, y2: position.y, class: "agent-lane" }));
    viewport.appendChild(create("text", { x: 265, y: position.y - 23, class: "agent-lane-label" }, "Workstream " + String(index + 1).padStart(2, "0")));
  });

  addNode(root, rootPosition.x, rootPosition.y);
  tasks.forEach(function (task) { var position = positions.get(task.id); addNode(task, position.x, position.y); });
  data.nodes.filter(function (node) { return node.kind === "subagent"; }).forEach(function (node) {
    var position = positions.get(node.id);
    if (position) addNode(node, position.x, position.y);
  });

  function fitDay() {
    var width = svg.viewBox.baseVal.width;
    var height = svg.viewBox.baseVal.height;
    transform.k = Math.min(width / 980, height / data.height) * 0.94;
    transform.x = (width - 980 * transform.k) / 2;
    transform.y = (height - data.height * transform.k) / 2;
    applyTransform();
  }

  stage.addEventListener("wheel", function (event) {
    event.preventDefault();
    transform.k = Math.max(0.32, Math.min(2.8, transform.k * (event.deltaY < 0 ? 1.08 : 1 / 1.08)));
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
  stage.addEventListener("pointerup", function () { drag = null; stage.classList.remove("is-dragging"); });
  document.getElementById("agent-day").addEventListener("toggle", function (event) {
    if (event.currentTarget.open) window.requestAnimationFrame(fitDay);
  });
  applyTransform();
}());
