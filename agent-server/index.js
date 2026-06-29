require('dotenv').config();
const fs               = require('fs');
const path             = require('path');
const TelegramBot      = require('node-telegram-bot-api');
const { Anthropic }    = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

// Credentials
const token           = process.env.TELEGRAM_BOT_TOKEN;
const allowedUserId   = parseInt(process.env.ALLOWED_TELEGRAM_USER_ID, 10);
const anthropicKey    = process.env.ANTHROPIC_API_KEY;
const supabaseUrl     = process.env.SUPABASE_URL;
const supabaseKey     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dashboardUserId = process.env.SUPABASE_USER_ID;

if (!token || !allowedUserId || !anthropicKey || !supabaseUrl || !supabaseKey || !dashboardUserId) {
  console.error("Critical Halt: Credentials missing in .env");
  process.exit(1);
}

const bot       = new TelegramBot(token, { polling: true });
const anthropic = new Anthropic({ apiKey: anthropicKey });
const supabase  = createClient(supabaseUrl, supabaseKey);

const MD_PATH = path.join(__dirname, 'BENICIO.md');
const sessions = {};
const MAX_MSGS  = 20;

function getHistory(uid) { if (!sessions[uid]) sessions[uid] = []; return sessions[uid]; }
function pushMsg(uid, msg) {
  const h = getHistory(uid);
  h.push(msg);
  while (h.length > MAX_MSGS) h.shift();
}

function mkTimestamp() {
  const n = new Date();
  return `${n.toLocaleDateString('en-CA')} ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

// Queue actions straight to the database table (Mirrors DashboardContext poll loop)
async function queueAction(type, payload) {
  const { error } = await supabase.from('agent_actions_queue').insert({
    user_id:   dashboardUserId,
    type,
    payload,
    is_sample: false,
    queued_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Queue write failed [${type}]: ${error.message}`);
  console.log(`Queued ${type}:`, JSON.stringify(payload));
}

// Global data snapshot fetcher — reads the same scope as the frontend widget layer.
// The service role key bypasses RLS; row-level isolation for writes is handled
// via dashboardUserId in queueAction, not by filtering reads here.
async function fetchDashboardData() {
  const today = new Date().toLocaleDateString('en-CA');

  const [
    spheresRes, projectsRes, tasksRes, habitsRes, quickNotesRes,
    recurringRes, logsRes, checkInsRes, networkRes
  ] = await Promise.all([
    supabase.from("spheres").select("*").order("sort_order"),
    supabase.from("projects").select("*"),
    supabase.from("tasks").select("*"),
    supabase.from("habits").select("*, habit_completions(completed_on)"),
    supabase.from("quick_notes").select("*").order("created_at", { ascending: false }),
    supabase.from("recurring_tasks").select("*"),
    supabase.from("historical_logs").select("*").order("date", { ascending: false }),
    supabase.from("daily_check_ins").select("*").order("date", { ascending: false }),
    supabase.from("network_contacts").select("*, contact_events(*)")
  ]);

  const sphereRows  = spheresRes.data  || [];
  const projectRows = projectsRes.data || [];
  const taskRows    = tasksRes.data    || [];

  const sphereNameById  = new Map(sphereRows.map(s => [s.id, s.name]));
  const projectNameById = new Map(projectRows.map(p => [p.id, p.name]));

  // Only include projects whose sphere_id resolves to a known sphere.
  // Rows with a null or dangling foreign key are excluded so they don't
  // inflate sphere counts or bleed into unrelated areas.
  const validProjects = projectRows.filter(p => p.sphere_id && sphereNameById.has(p.sphere_id));

  return {
    currentTrackingDate: today,
    spheres: sphereRows.map(s => ({ id: s.id, name: s.name })),
    projects: validProjects.map(p => ({
      id:       p.id,
      name:     p.name,
      sphereId: p.sphere_id,                    // UUID — used for strict UUID filtering in executeItem
      sphere:   sphereNameById.get(p.sphere_id), // resolved name — used for display in the prompt
    })),
    tasks: taskRows.map(t => ({
      id:         t.id,
      title:      t.title,
      sphere:     sphereNameById.get(t.sphere_id) || "No Sphere",
      project:    projectNameById.get(t.project_id) || "No Project",
      done:       t.done || false
    })),
    habits: (habitsRes.data || []).map(h => ({
      id: h.id,
      title: h.title,
      type: h.type
    })),
    quickNotes: (quickNotesRes.data || []).map(n => ({
      id:        n.id,
      text:      n.text,
      sphere:    sphereNameById.get(n.sphere_id) || "iowa"
    })),
    recurringTasks: (recurringRes.data || []).map(r => ({
      id: r.id, title: r.title, intervalLabel: r.interval_label, lastDoneDate: r.last_done_date
    })),
    networkContacts: (networkRes.data || []).map(c => ({
      id: c.id, name: c.name, notes: c.notes || ""
    })),
    calendarLogs: (logsRes.data || []).slice(0, 5).map(l => `${l.date}: ${l.recap || 'Logged'}`)
  };
}

function findByTitle(arr, title) {
  return (arr || []).find(x => x.title?.toLowerCase() === title?.toLowerCase());
}

// Comprehensive schemas mapping all active container targets
const TOOLS = [
  {
    name: "manage_dashboard_item",
    description: "Handles creation, completion, and removal of dashboard widgets (tasks, notes, habits, recurring items).",
    input_schema: {
      type: "object",
      properties: {
        itemType:  { type: "string", enum: ["task", "habit", "note", "recurring"] },
        action:    { type: "string", enum: ["create", "complete", "delete", "toggle", "focus"] },
        title:     { type: "string", description: "Item title or note text string." },
        sphere:    { type: "string" },
        project:   { type: "string" }
      },
      required: ["itemType", "action", "title"],  // sphere intentionally omitted — Claude must ask when unspecified
    },
  }
];

async function executeItem(input, snap) {
  const { itemType, action, title, sphere, project } = input;
  const today = new Date().toLocaleDateString('en-CA');
  const ts = mkTimestamp();

  // Resolve the target sphere by case-insensitive name match, falling back to
  // the first available sphere. We keep the full object so we can use its UUID.
  const matchedSphereObj  = sphere
    ? snap.spheres.find(s => s.name?.toLowerCase() === sphere.toLowerCase())
    : null;
  const resolvedSphereObj = matchedSphereObj ?? snap.spheres[0] ?? null;
  const resolvedSphere    = resolvedSphereObj?.name ?? 'iowa';
  const resolvedSphereId  = resolvedSphereObj?.id   ?? null;

  // Filter strictly by UUID so name-based collisions can never bleed projects
  // from one sphere into another (mirrors the frontend's FK join behavior).
  const sphereProjects  = resolvedSphereId
    ? snap.projects.filter(p => p.sphereId === resolvedSphereId)
    : [];
  const matchedProject  = sphereProjects.find(p => p.name?.toLowerCase() === project?.toLowerCase());
  const resolvedProject = matchedProject?.name ?? sphereProjects[0]?.name ?? 'No Project';

  // Tasks
  if (itemType === "task") {
    if (action === "create") {
      await queueAction("ADD_TASK", {
        title, sphere: resolvedSphere, project: resolvedProject,
        priority: 'Med', energy: 'Easy', urgency: 'not-urgent',
        done: false, deadline: null, notes: '', manualMinutes: 0, is_sample: false,
        queuedDate: null, timeSpentMinutes: 0, intent: 'finish', dailyTargetMinutes: null,
        rolloverCount: 0, dailyTracking: {}
      });
      return `Task created successfully.`;
    }
    if (action === "complete") {
      const task = findByTitle(snap?.tasks, title);
      if (!task) return `Task not found.`;
      await queueAction("UPDATE_TASK", { id: task.id, fields: { done: true } });
      return `Task checked off.`;
    }
    if (action === "focus") {
      const task = findByTitle(snap?.tasks, title);
      if (!task) return `Task not found.`;
      await queueAction("TOGGLE_TASK_FOR_TODAY", {
        id: task.id,
        dateString: today,
        intent: "finish",
        targetMinutes: null
      });
      return `Task "${title}" pinned to Today's Focus deck.`;
    }
  }

  // Quick Notes — require an explicitly matched sphere; never silently fall back
  if (itemType === "note" && action === "create") {
    if (!sphere || !matchedSphereObj) {
      return `Please specify which Area/Sphere this note belongs to. Active spheres: ${snap.spheres.map(s => s.name).join(', ')}.`;
    }
    await queueAction("ADD_QUICK_NOTE", {
      text: title,
      sphere: resolvedSphere,
      projectId: undefined,
      createdAt: ts,
      isImportant: false
    });
    return `Note successfully logged under ${resolvedSphere}.`;
  }

  if (itemType === "habit" && action === "toggle") {
    const habit = findByTitle(snap?.habits, title);
    if (!habit) return `Habit not found.`;
    await queueAction("TOGGLE_HABIT_DATE", { id: habit.id, dateString: today });
    return `Habit toggle command executed.`;
  }

  if (itemType === "recurring" && action === "complete") {
    const rec = (snap.recurringTasks || []).find(r => r.title?.toLowerCase() === title?.toLowerCase());
    if (!rec) return `Recurring task not located.`;
    await queueAction("COMPLETE_RECURRING_TASK", { id: rec.id });
    return `Recurring target transaction sent to queue.`;
  }

  return `Action complete.`;
}

// Bot Loop
bot.on('message', async (msg) => {
  if (!msg.text || msg.from.id !== allowedUserId) return;

  try {
    const snap = await fetchDashboardData();
    let system = fs.existsSync(MD_PATH) ? fs.readFileSync(MD_PATH, 'utf8') : "You are Benicio.";

    // Feed EVERY single widget list item directly into Claude's prompt context rooms
    system += `\n\n## CURRENT LIVE DASHBOARD STATE:\n` +
              `Spheres/Areas: ${snap.spheres.map(s => s.name).join(', ')}\n` +
              `Projects: ${snap.projects.map(p => `${p.name} [${p.sphere}]`).join(', ')}\n` +
              `Open Tasks: ${snap.tasks.filter(t=>!t.done).map(t => `${t.title} (${t.project})`).join(', ')}\n` +
              `Habits: ${snap.habits.map(h => h.title).join(', ')}\n` +
              `Recurring Allocations: ${snap.recurringTasks.map(r => r.title).join(', ')}\n` +
              `Network Contacts: ${snap.networkContacts.map(c => c.name).join(', ')}\n` +
              `Recent Calendar Recap items: ${snap.calendarLogs.join(' | ' || 'None')}\n`;

    system += "\nCRITICAL: If the user commands you to create a task, note, or habit but does not specify which Area/Sphere it belongs to, DO NOT guess or call a tool. Instead, reply immediately asking the user which active sphere they would like to place it in.";

    const res1 = await anthropic.messages.create({
      model:      'claude-3-5-haiku-20241022',
      max_tokens: 700,
      system,
      tools:      TOOLS,
      messages:   [{ role: 'user', content: msg.text }],
    });

    const toolBlocks = res1.content.filter(b => b.type === 'tool_use');

    if (toolBlocks.length > 0) {
      const toolResults = await Promise.all(toolBlocks.map(async block => {
        const result = await executeItem(block.input, snap);
        return { type: 'tool_result', tool_use_id: block.id, content: result };
      }));

      const res2 = await anthropic.messages.create({
        model:      'claude-3-5-haiku-20241022',
        max_tokens: 200,
        system,
        tools:      TOOLS,
        messages:   [{ role: 'user', content: msg.text }, { role: 'assistant', content: res1.content }, { role: 'user', content: toolResults }],
      });

      await bot.sendMessage(allowedUserId, res2.content.find(b => b.type === 'text')?.text || 'Done.');
    } else {
      await bot.sendMessage(allowedUserId, res1.content.find(b => b.type === 'text')?.text || '...');
    }
  } catch (err) {
    console.error(err);
    await bot.sendMessage(allowedUserId, "Engine error.");
  }
});

console.log("Benicio Connected — Global Full Widget Vision initialized.");