/* Render the committed daily snapshot as one pan-and-zoom SVG work graph. */
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
  if (!data || !stage || !svg || !viewport || !detail || !tooltip) return;

  var NS = "http://www.w3.org/2000/svg";
  var nodeById = new Map(data.nodes.map(function (node) { return [node.id, node]; }));
  var transform = { x: 0, y: 0, k: 0.88 };
  var drag = null;

  function create(name, attrs, text) {
    var element = document.createElementNS(NS, name);
    Object.entries(attrs || {}).forEach(function (entry) { element.setAttribute(entry[0], entry[1]); });
    if (text) element.textContent = text;
    return element;
  }

  function safe(value) {
    return String(value).replace(/[&<>\"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character];
    });
  }

  function tokens(value) {
    return value == null ? "usage unavailable" : new Intl.NumberFormat().format(value) + " observed tokens";
  }

  function kindLabel(kind) {
    return { main: "Coordinator", task: "Workstream", subagent: "Subagent" }[kind] || kind;
  }

  function summary(value) {
    return String(value || "No summary published.").replace(/\s+/g, " ").trim();
  }

  function applyTransform() {
    viewport.setAttribute("transform", "translate(" + transform.x + " " + transform.y + ") scale(" + transform.k + ")");
  }

  data.lanes.forEach(function (lane) {
    viewport.appendChild(create("line", { x1: 160, y1: lane.y, x2: data.width - 55, y2: lane.y, class: "agent-lane" }));
    viewport.appendChild(create("text", { x: 12, y: lane.y + 4, class: "agent-lane-label" }, lane.label));
  });

  data.ticks.forEach(function (tick) {
    viewport.appendChild(create("line", { x1: tick.x, y1: 35, x2: tick.x, y2: data.height - 42, class: "agent-tick" }));
    viewport.appendChild(create("text", { x: tick.x, y: data.height - 18, class: "agent-tick-label" }, tick.label));
  });

  data.edges.forEach(function (edge) {
    var source = nodeById.get(edge.source);
    var target = nodeById.get(edge.target);
    if (!source || !target) return;
    var bend = (source.x + target.x) / 2;
    viewport.appendChild(create("path", {
      d: "M" + source.x + "," + source.y + " C" + bend + "," + source.y + " " + bend + "," + target.y + " " + target.x + "," + target.y,
      class: "agent-edge " + edge.kind
    }));
  });

  function select(mark, node) {
    viewport.querySelectorAll(".agent-node.is-selected").forEach(function (item) { item.classList.remove("is-selected"); });
    mark.classList.add("is-selected");
    detail.innerHTML = "<strong>" + safe(node.label) + "</strong> · " + safe(node.time) + " · " + safe(tokens(node.tokens)) + " — " + safe(node.detail);
  }

  function select(mark, node) {
    viewport.querySelectorAll(".agent-node.is-selected").forEach(function (item) { item.classList.remove("is-selected"); });
    mark.classList.add("is-selected");
    if (!detailTable || !detailRows) return;
    detailRows.innerHTML = [
      ["Conversation", node.label],
      ["Type", kindLabel(node.kind)],
      ["Status", node.status || "unknown"],
      ["Started", node.time || "unknown"],
      ["Usage", tokens(node.tokens)],
      ["Summary", summary(node.detail)]
    ].map(function (row) {
      return "<tr><th scope=\"row\">" + safe(row[0]) + "</th><td>" + safe(row[1]) + "</td></tr>";
    }).join("");
    detailTable.hidden = false;
  }

  data.nodes.forEach(function (node) {
    var group = create("g");
    var mark;
    if (node.kind === "task") {
      mark = create("rect", {
        x: node.x - node.radius, y: node.y - node.radius, width: node.radius * 2, height: node.radius * 2,
        transform: "rotate(45 " + node.x + " " + node.y + ")", rx: 2, class: "agent-node task"
      });
    } else {
      mark = create("circle", { cx: node.x, cy: node.y, r: node.radius, class: "agent-node " + node.kind });
    }
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-label", node.label + ", " + tokens(node.tokens));
    group.appendChild(mark);
    if (node.kind !== "subagent") {
      group.appendChild(create("text", { x: node.x + node.radius + 7, y: node.y + 4, class: "agent-node-label" }, node.label));
    }
    viewport.appendChild(group);

    mark.addEventListener("mouseenter", function () {
      tooltip.innerHTML = "<strong>" + safe(node.label) + "</strong><span>" + safe(node.time) + " · " + safe(tokens(node.tokens)) + "</span>";
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
  });

  function fitDay() {
    var width = svg.viewBox.baseVal.width;
    var height = svg.viewBox.baseVal.height;
    transform.k = Math.min(width / data.width, height / data.height) * 0.94;
    transform.x = (width - data.width * transform.k) / 2;
    transform.y = (height - data.height * transform.k) / 2;
    applyTransform();
  }

  stage.addEventListener("wheel", function (event) {
    event.preventDefault();
    transform.k = Math.max(0.22, Math.min(2.8, transform.k * (event.deltaY < 0 ? 1.08 : 1 / 1.08)));
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
})();
