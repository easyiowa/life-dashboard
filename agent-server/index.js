require('dotenv').config();
const fs          = require('fs');
const path        = require('path');
const TelegramBot = require('node-telegram-bot-api');
const { Anthropic } = require('@anthropic-ai/sdk');

// ── Credentials ───────────────────────────────────────────────────────────────
const token         = process.env.TELEGRAM_BOT_TOKEN;
const allowedUserId = parseInt(process.env.ALLOWED_TELEGRAM_USER_ID, 10);
const anthropicKey  = process.env.ANTHROPIC_API_KEY;

if (!token || !allowedUserId || !anthropicKey) {
  console.error("Critical Halt: Credentials missing in .env");
  process.exit(1);
}

const bot       = new TelegramBot(token, { polling: true });
const anthropic = new Anthropic({ apiKey: anthropicKey });

const PENDING_PATH  = path.join(__dirname, 'agent-pending.json');
const SNAPSHOT_PATH = path.join(__dirname, 'dashboard-snapshot.json');
const MD_PATH       = path.join(__dirname, 'BENICIO.md');

// ── Rolling session history (10 turns max) ────────────────────────────────────
const sessions = {};
const MAX_MSGS  = 20;

function getHistory(uid) { if (!sessions[uid]) sessions[uid] = []; return sessions[uid]; }
function pushMsg(uid, msg) {
  const h = getHistory(uid);
  h.push(msg);
  while (h.length > MAX_MSGS) h.shift();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function mkTimestamp() {
  const n = new Date();
  return `${n.toLocaleDateString('en-CA')} ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

function readSnapshot() {
  if (!fs.existsSync(SNAPSHOT_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8')); } catch { return null; }
}

function queueAction(type, payload) {
  let q = [];
  if (fs.existsSync(PENDING_PATH)) { try { q = JSON.parse(fs.readFileSync(PENDING_PATH, 'utf8')); } catch { q = []; } }
  q.push({ type, payload, queuedAt: mkTimestamp() });
  fs.writeFileSync(PENDING_PATH, JSON.stringify(q, null, 2), 'utf8');
  console.log(`Queued ${type}:`, JSON.stringify(payload));
}

function parseInterval(str) {
  if (!str) return { days: 30, label: 'Every Month' };
  const n = parseInt(str) || 1;
  const s = str.toLowerCase();
  if (/year/i.test(s))  return { days: 365,    label: 'Every Year'     };
  if (/month/i.test(s)) return { days: n * 30,  label: n === 1 ? 'Every Month'  : `Every ${n} Months` };
  if (/week/i.test(s))  return { days: n * 7,   label: n === 1 ? 'Every Week'   : `Every ${n} Weeks`  };
  if (/day/i.test(s))   return { days: n,        label: `Every ${n} Days` };
  return { days: 30, label: str };
}

const HABIT_EMOJI = [
  [/water|hydrat/i,'💧'],[/gym|workout|run|exercise/i,'💪'],[/read|book|study/i,'📚'],
  [/meditat|mindful/i,'🧘'],[/sleep|rest/i,'😴'],[/walk|step|hike/i,'🚶'],
  [/journal|write/i,'📝'],[/screen|phone|social/i,'📵'],[/coffee/i,'☕'],
  [/alcohol|wine|beer/i,'🍷'],[/code|dev|program/i,'💻'],[/junk|sugar|fast.?food/i,'🍔'],
];
function guessEmoji(t) { for (const [re, e] of HABIT_EMOJI) if (re.test(t)) return e; return '⭐'; }

function findByTitle(arr, title) {
  return (arr || []).find(x => x.title?.toLowerCase() === title?.toLowerCase());
}

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "manage_dashboard_item",
    description: "Handles creation, updates, deletion, and status changes for tasks, habits, notes, recurring responsibilities, and timer control. Call only on Olaf's explicit command.",
    input_schema: {
      type: "object",
      properties: {
        itemType:  { type: "string", enum: ["task", "habit", "note", "recurring", "timer"] },
        action:    { type: "string", enum: ["create", "update", "delete", "complete", "start_timer", "pause_timer", "complete_recurring", "log_status"] },
        title:     { type: "string", description: "Item title (task, habit, or recurring name)." },
        sphere:    { type: "string", enum: ["iowa", "siin", "vibing", "education"] },
        project:   { type: "string", description: "Exact project name for tasks." },
        priority:  { type: "string", enum: ["High", "Med", "Low"] },
        urgency:   { type: "string", enum: ["urgent", "not-urgent"] },
        energy:    { type: "string", enum: ["Flow", "Quick", "Easy"] },
        timeGoal:  { type: "number", description: "Target minutes for timed tasks." },
        interval:  { type: "string", description: "Recurrence interval e.g. '30 Days', '2 Weeks', '6 Months'." },
        routine:   { type: "string", enum: ["morning", "day", "evening"] },
        habitType: { type: "string", enum: ["building", "breaking"] },
        text:      { type: "string", description: "Raw note content." },
      },
      required: ["itemType", "action"],
    },
  },
  {
    name: "manage_dashboard_structure",
    description: "Creates or modifies dashboard structural containers: projects and spheres.",
    input_schema: {
      type: "object",
      properties: {
        action:      { type: "string", enum: ["create_project", "rename_project", "rename_sphere"] },
        projectName: { type: "string", description: "Project name to create or target." },
        sphereName:  { type: "string", description: "Sphere name for the project, or sphere to rename." },
        sphereEmoji: { type: "string", description: "Emoji to associate with a sphere." },
        newName:     { type: "string", description: "New name when renaming." },
      },
      required: ["action"],
    },
  },
  {
    name: "fetch_full_dashboard_snapshot",
    description: "Reads and returns the full live dashboard data — tasks, habits, notes, recurring items — for context-aware queries and audits.",
    input_schema: { type: "object", properties: {} },
  },
];

// ── manage_dashboard_item executor ───────────────────────────────────────────
function executeItem(input, snap) {
  const { itemType, action, title, sphere, project, priority, urgency, energy, timeGoal, interval, routine, habitType, text } = input;
  const ts    = mkTimestamp();
  const today = new Date().toLocaleDateString('en-CA');

  // TASK ───────────────────────────────────────────────────────────────────────
  if (itemType === "task") {
    if (action === "create") {
      queueAction("ADD_TASK", {
        title, sphere, project: project || 'No Project',
        priority: priority || 'Med', energy: energy || 'Easy',
        urgency: urgency || 'not-urgent',
        done: false, deadline: null, notes: '', manualMinutes: 0,
      });
      return `Task created: "${title}" — ${sphere} / ${project || 'No Project'}`;
    }
    if (action === "complete" || action === "update" || action === "log_status") {
      const task = findByTitle(snap?.tasks, title);
      if (!task) return `Task not found: "${title}"`;
      const fields = action === "complete"
        ? { done: true }
        : { ...(priority && { priority }), ...(urgency && { urgency }), ...(energy && { energy }) };
      queueAction("UPDATE_TASK", { id: task.id, fields });
      return `Task ${action}: "${task.title}"`;
    }
    if (action === "delete") {
      const task = findByTitle(snap?.tasks, title);
      if (!task) return `Task not found: "${title}"`;
      queueAction("DELETE_TASK", { id: task.id });
      return `Task deleted: "${task.title}"`;
    }
  }

  // HABIT ──────────────────────────────────────────────────────────────────────
  if (itemType === "habit") {
    if (action === "create") {
      queueAction("ADD_HABIT", {
        title,
        type:        habitType === "breaking" ? 'stop' : 'start',
        routine:     routine || 'day',
        frequency:   'daily',
        targetCount: 5,
        emoji:       guessEmoji(title || ''),
        notes:       '',
      });
      return `Habit created: "${title}" [${habitType || 'building'}/${routine || 'day'}]`;
    }
    if (action === "complete") {
      const habit = findByTitle(snap?.habits, title);
      if (!habit) return `Habit not found: "${title}"`;
      queueAction("TOGGLE_HABIT_DATE", { id: habit.id, dateString: today });
      return `Habit logged today: "${habit.title}"`;
    }
    if (action === "delete") {
      const habit = findByTitle(snap?.habits, title);
      if (!habit) return `Habit not found: "${title}"`;
      queueAction("DELETE_HABIT", { id: habit.id });
      return `Habit deleted: "${habit.title}"`;
    }
  }

  // NOTE ───────────────────────────────────────────────────────────────────────
  if (itemType === "note") {
    if (action === "create") {
      queueAction("ADD_QUICK_NOTE", {
        text: text || title, sphere: sphere || 'iowa',
        projectId: project || undefined, createdAt: ts,
      });
      return `Note saved to ${sphere}: "${text || title}"`;
    }
    if (action === "delete") {
      const note = (snap?.quickNotes || []).find(n => n.text?.toLowerCase().includes((text || title || '').toLowerCase()));
      if (!note) return `Note not found`;
      queueAction("DELETE_QUICK_NOTE", { id: note.id });
      return `Note deleted`;
    }
  }

  // RECURRING ──────────────────────────────────────────────────────────────────
  if (itemType === "recurring") {
    if (action === "create") {
      const { days, label } = parseInterval(interval);
      queueAction("ADD_RECURRING_TASK", {
        title, notes: '', intervalDays: days, intervalLabel: label,
        sphere: sphere || 'iowa', lastDoneDate: null,
      });
      return `Recurring task created: "${title}" (${label})`;
    }
    if (action === "complete_recurring") {
      const rec = findByTitle(snap?.recurringTasks, title);
      if (!rec) return `Recurring task not found: "${title}"`;
      queueAction("COMPLETE_RECURRING_TASK", { id: rec.id });
      return `Recurring task completed: "${rec.title}"`;
    }
    if (action === "delete") {
      const rec = findByTitle(snap?.recurringTasks, title);
      if (!rec) return `Recurring task not found: "${title}"`;
      queueAction("DELETE_RECURRING_TASK", { id: rec.id });
      return `Recurring task deleted: "${rec.title}"`;
    }
  }

  // TIMER ──────────────────────────────────────────────────────────────────────
  if (itemType === "timer") {
    if (action === "start_timer") {
      const task = findByTitle(snap?.tasks, title);
      if (!task) return `Task not found for timer: "${title}"`;
      queueAction("START_TASK", {
        id: task.id, title: task.title, project: task.project,
        sphere: task.sphere, estimatedMinutes: timeGoal || 25,
      });
      return `Timer started: "${task.title}" (${timeGoal || 25}m)`;
    }
    if (action === "pause_timer") {
      queueAction("PAUSE_SESSION", {});
      return `Timer paused`;
    }
  }

  return `No handler for ${itemType}/${action}`;
}

// ── manage_dashboard_structure executor ──────────────────────────────────────
function executeStructure(input, snap) {
  const { action, projectName, sphereName, sphereEmoji, newName } = input;

  if (action === "create_project") {
    queueAction("ADD_PROJECT", {
      name: projectName, sphere: sphereName || 'iowa',
      emoji: sphereEmoji || '📁', tagIds: [], status: 'on-track', milestone: 'In progress',
    });
    return `Project created: "${projectName}" in "${sphereName}"`;
  }

  if (action === "rename_project") {
    const project = (snap?.projects || []).find(p => p.name.toLowerCase() === projectName?.toLowerCase());
    if (!project) return `Project not found: "${projectName}"`;
    queueAction("UPDATE_PROJECT", { id: project.id, fields: { name: newName } });
    return `Project renamed: "${projectName}" → "${newName}"`;
  }

  if (action === "rename_sphere") {
    return `Sphere renaming requires manual action in the dashboard settings.`;
  }

  return `Unhandled structure action: ${action}`;
}

// ── fetch_full_dashboard_snapshot executor ────────────────────────────────────
function executeFetchSnapshot(snap) {
  if (!snap) return "No snapshot available. Olaf needs to open the dashboard in his browser first.";
  const today = snap.currentTrackingDate || '';
  return JSON.stringify({
    date:           today,
    openTasks:      (snap.tasks || []).filter(t => !t.done)
                      .map(t => ({ title: t.title, priority: t.priority, urgency: t.urgency, sphere: t.sphere, project: t.project })),
    habits:         (snap.habits || []).map(h => ({ title: h.title, type: h.type, routine: h.routine, emoji: h.emoji })),
    recurringTasks: (snap.recurringTasks || []).map(r => ({ title: r.title, intervalLabel: r.intervalLabel, sphere: r.sphere })),
    notesToday:     (snap.quickNotes || []).filter(n => n.createdAt?.startsWith(today))
                      .map(n => ({ text: n.text, sphere: n.sphere })),
    projects:       (snap.projects || []).map(p => ({ name: p.name, sphere: p.sphere })),
    spheres:        snap.spheres ? snap.spheres.map(s => s.name) : [...new Set((snap.projects || []).map(p => p.sphere))],
  }, null, 2);
}

// ── Tool dispatcher ───────────────────────────────────────────────────────────
function dispatchTool(block, snap) {
  const { name, input } = block;
  if (name === 'manage_dashboard_item')       return executeItem(input, snap);
  if (name === 'manage_dashboard_structure')  return executeStructure(input, snap);
  if (name === 'fetch_full_dashboard_snapshot') return executeFetchSnapshot(snap);
  return `Unknown tool: ${name}`;
}

// ── Boot ──────────────────────────────────────────────────────────────────────
console.log("Benicio Online — Full Tool Suite v2 · Rolling Memory · Secure.");
bot.on('polling_error', (err) => console.error("Polling:", err.message || err));

// ── Message handler ───────────────────────────────────────────────────────────
bot.on('message', async (msg) => {
  if (!msg.text) return;
  if (msg.from.id !== allowedUserId) { bot.sendMessage(msg.from.id, "Access denied."); return; }

  const text = msg.text;
  console.log(`IN: "${text}"`);

  try {
    // Fresh snapshot read on every message
    const snap = readSnapshot();

    // Live data extraction
    const projects = (snap?.projects || []).map(p => ({ name: p.name, sphere: p.sphere }));
    const spheres  = snap?.spheres
      ? snap.spheres.map(s => s.name)
      : [...new Set(projects.map(p => p.sphere))].filter(Boolean);

    // System prompt: BENICIO.md + live context + validation guardrails
    let system = fs.existsSync(MD_PATH) ? fs.readFileSync(MD_PATH, 'utf8') : "You are Benicio, Olaf's executive assistant.";

    if (snap) {
      const today  = snap.currentTrackingDate || '';
      const open   = (snap.tasks || []).filter(t => !t.done);
      const habits = snap.habits || [];
      const notes  = (snap.quickNotes || []).filter(n => n.createdAt?.startsWith(today));

      system +=
        `\n\n---\n## Live Dashboard — ${today}` +
        `\nOpen Tasks (${open.length}):\n` +
        (open.length ? open.slice(0, 15).map(t => `- [${t.urgency === 'urgent' ? 'URGENT ' : ''}${t.priority}] ${t.title} (${t.project} / ${t.sphere})`).join('\n') : '- None') +
        `\nHabits (${habits.length}):\n` +
        (habits.length ? habits.map(h => `- ${h.emoji} ${h.title} [${h.type}]`).join('\n') : '- None') +
        `\nNotes Today (${notes.length}):\n` +
        (notes.length ? notes.map(n => `- "${n.text}" [${n.sphere}]`).join('\n') : '- None') +
        `\n\n## Validation Guardrails` +
        `\nValid spheres: ${spheres.map(s => `"${s}"`).join(', ')}` +
        `\nValid projects:\n${projects.map(p => `- "${p.name}" (sphere: "${p.sphere}")`).join('\n')}` +
        `\n\nTool rules:` +
        `\n1. sphere and project MUST exactly match the lists above. No invented names.` +
        `\n2. For tasks: if sphere or project is ambiguous or missing, do NOT fire the tool. Ask: "Which project, Olaf? Current lines: ${projects.map(p => p.name).join(', ')}"` +
        `\n3. Only trigger tools on explicit create/update/delete/complete commands.` +
        `\n---`;
    }

    pushMsg(allowedUserId, { role: 'user', content: text });

    // First Claude call
    const res1 = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 700,
      system,
      tools:      TOOLS,
      messages:   getHistory(allowedUserId),
    });

    const toolBlocks = res1.content.filter(b => b.type === 'tool_use');

    if (toolBlocks.length > 0) {
      // Execute every triggered tool and collect all results into one array
      const toolResults = toolBlocks.map(block => {
        console.log(`Tool: ${block.name}`, JSON.stringify(block.input));
        const result = dispatchTool(block, snap);
        console.log(`Result [${block.name}]: ${result}`);
        return { type: 'tool_result', tool_use_id: block.id, content: result };
      });

      // Push assistant message (contains all tool_use blocks) then all results in one user turn
      pushMsg(allowedUserId, { role: 'assistant', content: res1.content });
      pushMsg(allowedUserId, { role: 'user', content: toolResults });

      // Second call — Claude receives all results and generates confirmation
      const res2 = await anthropic.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 200,
        system,
        tools:      TOOLS,
        messages:   getHistory(allowedUserId),
      });

      const reply = res2.content.find(b => b.type === 'text')?.text || 'Done.';
      pushMsg(allowedUserId, { role: 'assistant', content: reply });
      await bot.sendMessage(allowedUserId, reply);
      console.log(`OUT (tool×${toolBlocks.length}): "${reply.replace(/\n/g,' ')}"`);

    } else {
      const reply = res1.content.find(b => b.type === 'text')?.text || '...';
      pushMsg(allowedUserId, { role: 'assistant', content: reply });
      await bot.sendMessage(allowedUserId, reply);
      console.log(`OUT: "${reply.replace(/\n/g,' ')}"`);
    }

  } catch (err) {
    console.error("Engine fault:", err);
    await bot.sendMessage(allowedUserId, "Engine fault. Check the terminal, Olaf.");
  }
});
