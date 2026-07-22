/* Load compact daily audit projections and render one task graph at a time. */
(function () {
  "use strict";

  var container = document.getElementById("worklog-days");
  if (!container) return;

  var NS = "http://www.w3.org/2000/svg";

  function element(name, className, text) {
    var node = document.createElement(name);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function svgElement(name, attrs, text) {
    var node = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text != null) node.textContent = text;
    return node;
  }

  function tokenLabel(value, longForm) {
    if (value == null) return "not retained";
    if (longForm) return new Intl.NumberFormat("en-US").format(value) + " tokens";
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }

  function dateLabel(value) {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    }).format(new Date(value + "T12:00:00Z"));
  }

  function groupLabel(entry) {
    var labels = entry.labels || [];
    if (!labels.length) return "No retained groups";
    if (labels.length <= 2) return labels.join(" · ");
    return labels.slice(0, 2).join(" · ") + " +" + (labels.length - 2);
  }

  function usageCell(value, label) {
    var cell = element("div");
    cell.appendChild(element("strong", null, value));
    cell.appendChild(element("span", null, label));
    return cell;
  }

  function countAgents(day) {
    var count = 0;
    day.groups.forEach(function (group) {
      group.tasks.forEach(function (task) {
        task.sessions.forEach(function (session) { count += session.agents.length; });
      });
    });
    return count;
  }

  function metadataRow(label, value) {
    var row = element("div");
    row.appendChild(element("dt", null, label));
    row.appendChild(element("dd", null, value == null || value === "" ? "not retained" : String(value)));
    return row;
  }

  function taskNodes(task) {
    var nodes = [{
      id: task.id,
      type: "reasoning",
      parentId: null,
      label: task.label,
      role: "task group",
      description: task.description,
      tokens: task.usage.combinedTokens,
      time: task.sessions.length ? task.sessions[0].time : null,
      status: task.usage.complete ? "complete usage" : "partial usage",
      model: null
    }];
    var multipleSessions = task.sessions.length > 1;

    task.sessions.forEach(function (session) {
      var sessionParent = task.id;
      if (multipleSessions) {
        nodes.push({
          id: session.id,
          type: "reasoning",
          parentId: task.id,
          label: (session.time || "Unknown time") + " session",
          role: "main session",
          description: session.description,
          tokens: session.tokens,
          time: session.time,
          status: session.status,
          model: session.model
        });
        sessionParent = session.id;
      }

      var agentIds = new Set(session.agents.map(function (agent) { return agent.id; }));
      session.agents.forEach(function (agent) {
        var parentId = agent.parentId;
        if (!agentIds.has(parentId)) parentId = sessionParent;
        nodes.push({
          id: agent.id,
          type: "subagent",
          parentId: parentId,
          label: agent.nickname || agent.label,
          role: agent.label,
          description: agent.description,
          tokens: agent.tokens,
          time: agent.time,
          status: agent.status,
          model: agent.model
        });
      });
    });
    return nodes;
  }

  function createTaskGraph(host, task) {
    host.replaceChildren();

    var toolbar = element("div", "trace-toolbar");
    var legend = element("div", "trace-legend");
    legend.setAttribute("aria-label", "Graph legend");
    var mainLegend = element("span");
    mainLegend.appendChild(element("i", "legend-mark reasoning"));
    mainLegend.appendChild(document.createTextNode(" main"));
    var agentLegend = element("span");
    agentLegend.appendChild(element("i", "legend-mark subagent"));
    agentLegend.appendChild(document.createTextNode(" subagent"));
    legend.append(mainLegend, agentLegend);
    toolbar.appendChild(legend);
    toolbar.appendChild(element("p", null, "Select blue nodes to collapse. Scroll to zoom; drag to pan."));

    var layout = element("div", "trace-layout");
    var stage = element("div", "agent-graph-stage");
    var svg = svgElement("svg", { viewBox: "0 0 1100 680", role: "img" });
    svg.appendChild(svgElement("title", null, task.label + " agent graph"));
    svg.appendChild(svgElement("desc", null, "A task group with main sessions and delegated subagents."));
    var viewport = svgElement("g");
    svg.appendChild(viewport);
    var tooltip = element("div", "agent-graph-tooltip");
    tooltip.hidden = true;
    stage.append(svg, tooltip);

    var detail = element("aside", "agent-graph-detail");
    detail.setAttribute("aria-live", "polite");
    var detailKicker = element("p", "detail-kicker", "Selected node");
    var detailTitle = element("h3");
    var detailLabel = element("p", "detail-label", "Retained output summary");
    var detailDescription = element("p");
    var availability = element("p", "detail-availability", "Public summaries only. Raw prompts, full outputs, local paths, and private reasoning are excluded.");
    var metadata = element("dl");
    detail.append(detailKicker, detailTitle, detailLabel, detailDescription, availability, metadata);
    layout.append(stage, detail);
    host.append(toolbar, layout);

    var nodes = taskNodes(task);
    var nodeById = new Map(nodes.map(function (node) { return [node.id, node]; }));
    var children = new Map();
    nodes.forEach(function (node) {
      if (!node.parentId) return;
      if (!children.has(node.parentId)) children.set(node.parentId, []);
      children.get(node.parentId).push(node);
    });
    var root = nodes[0];
    var collapsed = new Set();
    var selectedId = root.id;
    var transform = { x: 0, y: 0, k: 0.9 };
    var drag = null;
    var contentHeight = 680;

    function applyTransform() {
      viewport.setAttribute("transform", "translate(" + transform.x + " " + transform.y + ") scale(" + transform.k + ")");
    }

    function selectNode(node) {
      selectedId = node.id;
      detailKicker.textContent = node.role;
      detailTitle.textContent = node.label;
      detailDescription.textContent = node.description || "No public summary retained.";
      var parent = node.parentId && nodeById.get(node.parentId);
      metadata.replaceChildren(
        metadataRow("Parent", parent ? parent.label : "—"),
        metadataRow("Status", node.status),
        metadataRow("Started", node.time),
        metadataRow("Model", node.model),
        metadataRow("Usage", tokenLabel(node.tokens, true))
      );
    }

    function visibleNodes() {
      var visible = [];
      function visit(node, depth) {
        visible.push({ node: node, depth: depth });
        if (collapsed.has(node.id)) return;
        (children.get(node.id) || []).forEach(function (child) { visit(child, depth + 1); });
      }
      visit(root, 0);
      return visible;
    }

    function graphPositions(visible) {
      var levels = new Map();
      visible.forEach(function (entry) {
        if (!levels.has(entry.depth)) levels.set(entry.depth, []);
        levels.get(entry.depth).push(entry.node);
      });
      var positions = new Map();
      var cursorY = 70;
      Array.from(levels.keys()).sort(function (a, b) { return a - b; }).forEach(function (depth) {
        var levelNodes = levels.get(depth);
        var maxColumns = depth === 0 ? 1 : 8;
        var rows = Math.ceil(levelNodes.length / maxColumns);
        levelNodes.forEach(function (node, index) {
          var row = Math.floor(index / maxColumns);
          var inRow = Math.min(maxColumns, levelNodes.length - row * maxColumns);
          var column = index % maxColumns;
          var x = 90 + ((column + 1) * 920) / (inRow + 1);
          positions.set(node.id, { x: x, y: cursorY + row * 92 });
        });
        cursorY += rows * 92 + 68;
      });
      contentHeight = Math.max(680, cursorY + 30);
      return positions;
    }

    function shortLabel(value) {
      return value.length > 24 ? value.slice(0, 23) + "…" : value;
    }

    function showTooltip(mark, node) {
      tooltip.replaceChildren();
      tooltip.appendChild(element("strong", null, node.label));
      tooltip.appendChild(element("span", null, node.role + " · " + tokenLabel(node.tokens, false)));
      tooltip.hidden = false;
      var markBox = mark.getBoundingClientRect();
      var hostBox = stage.getBoundingClientRect();
      tooltip.style.left = Math.min(hostBox.width - tooltip.offsetWidth - 8, Math.max(8, markBox.right - hostBox.left + 8)) + "px";
      tooltip.style.top = Math.max(8, markBox.top - hostBox.top - tooltip.offsetHeight - 5) + "px";
    }

    function addNode(node, position) {
      var group = svgElement("g");
      var mark;
      var hasChildren = (children.get(node.id) || []).length > 0;
      if (node.type === "reasoning") {
        var width = node.id === root.id ? 184 : 150;
        mark = svgElement("rect", {
          x: position.x - width / 2,
          y: position.y - 24,
          width: width,
          height: 48,
          rx: 8,
          "class": "agent-node reasoning" + (collapsed.has(node.id) ? " is-collapsed" : "")
        });
        group.appendChild(mark);
        group.appendChild(svgElement("text", { x: position.x, y: position.y - 3, "class": "agent-node-label inside" }, shortLabel(node.label)));
        group.appendChild(svgElement("text", { x: position.x, y: position.y + 14, "class": "agent-node-meta inside" }, tokenLabel(node.tokens, false) + (hasChildren ? " · " + (collapsed.has(node.id) ? "+" : "−") : "")));
      } else {
        mark = svgElement("circle", { cx: position.x, cy: position.y, r: 11, "class": "agent-node subagent" });
        group.appendChild(mark);
        group.appendChild(svgElement("text", { x: position.x, y: position.y + 28, "class": "agent-node-label" }, shortLabel(node.label)));
        group.appendChild(svgElement("text", { x: position.x, y: position.y + 42, "class": "agent-node-meta" }, tokenLabel(node.tokens, false)));
      }
      if (node.id === selectedId) mark.classList.add("is-selected");
      mark.setAttribute("role", "button");
      mark.setAttribute("tabindex", "0");
      mark.setAttribute("aria-label", node.label + ", " + node.role + ", " + tokenLabel(node.tokens, true));

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
      var visible = visibleNodes();
      var positions = graphPositions(visible);
      visible.forEach(function (entry) {
        var node = entry.node;
        if (!node.parentId) return;
        var source = positions.get(node.parentId);
        var target = positions.get(node.id);
        if (!source || !target) return;
        var middle = (source.y + target.y) / 2;
        viewport.appendChild(svgElement("path", {
          d: "M" + source.x + "," + (source.y + 24) + " C" + source.x + "," + middle + " " + target.x + "," + middle + " " + target.x + "," + (target.y - 16),
          "class": "agent-edge delegation"
        }));
      });
      visible.forEach(function (entry) { addNode(entry.node, positions.get(entry.node.id)); });
      applyTransform();
    }

    function fitGraph() {
      transform.k = Math.max(0.28, Math.min(0.94, 610 / contentHeight));
      transform.x = (1100 - 1100 * transform.k) / 2;
      transform.y = 16;
      applyTransform();
    }

    stage.addEventListener("wheel", function (event) {
      event.preventDefault();
      transform.k = Math.max(0.24, Math.min(2.6, transform.k * (event.deltaY < 0 ? 1.08 : 1 / 1.08)));
      applyTransform();
    }, { passive: false });

    stage.addEventListener("pointerdown", function (event) {
      if (event.target.classList.contains("agent-node")) return;
      var unitX = 1100 / svg.clientWidth;
      var unitY = 680 / svg.clientHeight;
      drag = { x: event.clientX * unitX - transform.x, y: event.clientY * unitY - transform.y };
      stage.classList.add("is-dragging");
      stage.setPointerCapture(event.pointerId);
    });
    stage.addEventListener("pointermove", function (event) {
      if (!drag) return;
      var unitX = 1100 / svg.clientWidth;
      var unitY = 680 / svg.clientHeight;
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

    selectNode(root);
    render();
    fitGraph();
  }

  function renderDay(details, entry, day) {
    var body = element("div", "agent-day-body");
    var usage = element("div", "usage-strip");
    usage.setAttribute("aria-label", "Retained token usage summary");
    usage.append(
      usageCell(tokenLabel(day.usage.combinedTokens, false), day.usage.complete ? "combined tokens" : "retained tokens"),
      usageCell(tokenLabel(day.usage.mainThreadTokens, false), "main threads"),
      usageCell(tokenLabel(day.usage.subagentTokens, false), "subagents"),
      usageCell(String(countAgents(day)), "named agents")
    );
    body.appendChild(usage);

    var browser = element("div", "task-browser");
    var taskIndex = element("nav", "task-index");
    taskIndex.setAttribute("aria-label", "Tasks for " + dateLabel(day.day));
    var graphHost = element("div", "task-graph-host");
    var firstButton = null;

    day.groups.forEach(function (group) {
      var groupSection = element("section", "task-group");
      groupSection.appendChild(element("h3", null, group.label));
      var list = element("div", "task-list");
      group.tasks.forEach(function (task) {
        var button = element("button", "task-button");
        button.type = "button";
        button.appendChild(element("strong", null, task.label));
        var time = task.sessions.length ? task.sessions[0].time : null;
        button.appendChild(element("span", null, (time || "—") + " · " + tokenLabel(task.usage.combinedTokens, false)));
        button.addEventListener("click", function () {
          taskIndex.querySelectorAll(".task-button").forEach(function (candidate) { candidate.classList.remove("is-active"); });
          button.classList.add("is-active");
          createTaskGraph(graphHost, task);
        });
        if (!firstButton) firstButton = button;
        list.appendChild(button);
      });
      groupSection.appendChild(list);
      taskIndex.appendChild(groupSection);
    });
    browser.append(taskIndex, graphHost);
    body.appendChild(browser);

    var note = element("p", "work-note", "Summaries only. Raw prompts, full outputs, local paths, and private reasoning are excluded. ");
    var link = element("a", null, "Daily JSON");
    link.href = "./worklog/" + entry.path;
    note.appendChild(link);
    body.appendChild(note);
    details.appendChild(body);
    if (firstButton) firstButton.click();
  }

  function loadDay(details, entry) {
    if (details.dataset.loaded || details.dataset.loading) return;
    details.dataset.loading = "true";
    var status = element("p", "worklog-loading", "Loading day…");
    details.appendChild(status);
    fetch("./worklog/" + entry.path)
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (day) {
        status.remove();
        details.dataset.loaded = "true";
        delete details.dataset.loading;
        renderDay(details, entry, day);
      })
      .catch(function () {
        status.textContent = "This day could not be loaded.";
        delete details.dataset.loading;
      });
  }

  function renderIndex(index) {
    container.replaceChildren();
    if (!index.days || !index.days.length) {
      container.appendChild(element("p", "worklog-loading", "No public worklog dates yet."));
      return;
    }
    index.days.forEach(function (entry, position) {
      var details = element("details", "agent-day");
      var summary = element("summary");
      var time = element("time", null, dateLabel(entry.day));
      time.dateTime = entry.day;
      summary.appendChild(time);
      summary.appendChild(element("span", "day-project", groupLabel(entry)));
      summary.appendChild(element("span", "summary-usage", tokenLabel(entry.tokens, false)));
      details.appendChild(summary);
      details.addEventListener("toggle", function () {
        if (details.open) loadDay(details, entry);
      });
      container.appendChild(details);
      if (position === 0) {
        details.open = true;
        loadDay(details, entry);
      }
    });
  }

  fetch("./worklog/index.json")
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(renderIndex)
    .catch(function () {
      container.replaceChildren(element("p", "worklog-loading", "The public worklog could not be loaded."));
    });
}());
