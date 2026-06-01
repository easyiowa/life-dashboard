require('dotenv').config();
const fs          = require('fs');
const path        = require('path');
const TelegramBot = require('node-telegram-bot-api');
const { Anthropic } = require('@anthropic-ai/sdk');

// ── Credentials (never hardcoded) ─────────────────────────────────────────────
const token         = process.env.TELEGRAM_BOT_TOKEN;
const allowedUserId = parseInt(process.env.ALLOWED_TELEGRAM_USER_ID, 10);
const anthropicKey  = process.env.ANTHROPIC_API_KEY;

if (!token || !allowedUserId || !anthropicKey) {
  console.error("❌ Critical Halt: Credentials missing in .env");
  process.exit(1);
}

const bot       = new TelegramBot(token, { polling: true });
const anthropic = new Anthropic({ apiKey: anthropicKey });

const PENDING_PATH  = path.join(__dirname, 'agent-pending.json');
const SNAPSHOT_PATH = path.join(__dirname, 'dashboard-snapshot.json');
const MD_PATH       = path.join(__dirname, 'BENICIO.md');

// ── Rolling in-memory session history (max 10 turns = 20 messages) ────────────
const sessions = {};

function getHistory(uid) {
  if (!sessions[uid]) sessions[uid] = [];
  return sessions[uid];
}

function pushMsg(uid, msg) {
  const h = getHistory(uid);
  h.push(msg);
  while (h.length > 20) h.shift(); // trim oldest first
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
  if (fs.existsSync(PENDING_PATH)) {
    try { q = JSON.parse(fs.readFileSync(PENDING_PATH, 'utf8')); } catch { q = []; }
  }
  q.push({ type, payload, queuedAt: mkTimestamp() });
  fs.writeFileSync(PENDING_PATH, JSON.stringify(q, null, 2), 'utf8');
  console.log(`✅ Queued ${type}:`, JSON.stringify(payload));
}

// Maps Benicio sphere aliases → actual dashboard sphere names
const SPHERE_ALIASES = {
  iowa:      'Private',
  vibing:    'Private',
  personal:  'Private',
  siin:      'siin',
  education: 'education',
  study:     'education',
};

function resolveSphere(beniciSphere, snap) {
  const target = SPHERE_ALIASES[(beniciSphere || '').toLowerCase()] || beniciSphere || '';
  if (!snap?.spheres) return target || 'Private';
  const names = snap.spheres.map(s => s.name);
  return names.find(n => n.toLowerCase() === target.toLowerCase()) || names[0] || 'Private';
}

// Emoji suggestion for new habits
const HABIT_EMOJI = [
  [/water|hydrat/i,'💧'],[/gym|workout|run|exercise/i,'💪'],[/read|book|study/i,'📚'],
  [/meditat|mindful/i,'🧘'],[/sleep|rest/i,'😴'],[/walk|step|hike/i,'🚶'],
  [/journal|write/i,'📝'],[/screen|phone|social/i,'📵'],[/coffee/i,'☕'],
  [/alcohol|wine|beer/i,'🍷'],[/code|dev|program/i,'💻'],[/junk|sugar|fast.?food/i,'🍔'],
];
function guessEmoji(t) { for (const [re, e] of HABIT_EMOJI) if (re.test(t)) return e; return '⭐'; }

// ── Native Tool Definition ────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "add_dashboard_item",
    description: "Call this tool when Olaf explicitly commands you to add or log a task, habit, or quick note to his Life Dashboard. Do NOT call it for questions or general conversation.",
    input_schema: {
      type: "object",
      properties: {
        itemType: {
          type: "string",
          enum: ["note", "task", "habit"],
          description: "Type of item: 'note' for quick capture, 'task' for actionable to-dos, 'habit' for recurring behaviour tracking.",
        },
        content: {
          type: "string",
          description: "The raw text content or title of the item to add.",
        },
        sphere: {
          type: "string",
          enum: ["iowa", "siin", "vibing", "education"],
          description: "The life sphere this item belongs to. Default to 'iowa' if unclear.",
        },
        project: {
          type: "string",
          description: "Optional project name for tasks. Pass the exact project name if Olaf mentions one.",
        },
      },
      required: ["itemType", "content", "sphere"],
    },
  },
];

// ── Tool executor — writes real actions to the pending queue ──────────────────
function executeTool(input, snap) {
  const { itemType, content, sphere, project: inputProject } = input;
  const ts = mkTimestamp();

  if (itemType === "note") {
    queueAction("ADD_QUICK_NOTE", {
      text: content, sphere, projectId: undefined, createdAt: ts,
    });
    return `Note queued → ${sphere}: "${content}"`;
  }

  if (itemType === "habit") {
    const type      = /\b(stop|avoid|quit|break|no more|reduce|cut)\b/i.test(content) ? 'stop' : 'start';
    const routine   = /morning/i.test(content) ? 'morning' : /evening/i.test(content) ? 'evening' : 'day';
    const frequency = /weekly/i.test(content) ? 'weekly' : /monthly/i.test(content) ? 'monthly' : 'daily';
    queueAction("ADD_HABIT", {
      title: content, type, routine, frequency,
      targetCount: 5, emoji: guessEmoji(content), notes: '',
    });
    return `Habit queued [${type}/${routine}]: "${content}" → ${sphere}`;
  }

  if (itemType === "task") {
    const project  = inputProject || 'No Project';
    const priority = /\bhigh\b/i.test(content) ? 'High' : /\blow\b/i.test(content) ? 'Low' : 'Med';
    const energy   = /\bflow\b/i.test(content) ? 'Flow' : /\bquick\b/i.test(content) ? 'Quick' : 'Easy';
    const urgency  = /\burgent\b/i.test(content) ? 'urgent' : 'not-urgent';
    queueAction("ADD_TASK", {
      title: content, sphere, project, priority, energy, urgency,
      done: false, deadline: null, notes: '', manualMinutes: 0,
    });
    return `Task queued [${priority}/${sphere}]: "${content}"`;
  }

  return `Unknown itemType: ${itemType}`;
}

// ── Boot ──────────────────────────────────────────────────────────────────────
console.log("⚡ Benicio Online — Native Tool Use · Rolling Memory · Secure Env.");
bot.on('polling_error', (err) => console.error("🚨 Polling:", err.message || err));

// ── Message handler ───────────────────────────────────────────────────────────
bot.on('message', async (msg) => {
  if (!msg.text) return;
  if (msg.from.id !== allowedUserId) {
    bot.sendMessage(msg.from.id, "🔒 Access denied.");
    return;
  }

  const text = msg.text;
  console.log(`📥 Olaf: "${text}"`);

  try {
    const snap = readSnapshot();

    // Build system prompt (BENICIO.md + live dashboard context)
    let system = fs.existsSync(MD_PATH)
      ? fs.readFileSync(MD_PATH, 'utf8')
      : "You are Benicio, Olaf's executive assistant.";

    if (snap) {
      const today  = snap.currentTrackingDate || '';
      const open   = (snap.tasks || []).filter(t => !t.done);
      const habits = snap.habits || [];
      const notes  = (snap.quickNotes || []).filter(n => n.createdAt?.startsWith(today));
      system +=
        `\n\n---\n## 📊 Live Dashboard — ${today}` +
        `\n**Open Tasks (${open.length}):**\n` +
        (open.length ? open.map(t => `- [${t.urgency === 'urgent' ? '🔥 ' : ''}${t.priority}] ${t.title} (${t.sphere})`).join('\n') : '- None') +
        `\n**Habits (${habits.length}):**\n` +
        (habits.length ? habits.map(h => `- ${h.emoji} ${h.title} [${h.type}]`).join('\n') : '- None') +
        `\n**Notes Today (${notes.length}):**\n` +
        (notes.length ? notes.map(n => `- "${n.text}" [${n.sphere}]`).join('\n') : '- None') +
        '\n---';
    }

    // Push user message to rolling history
    pushMsg(allowedUserId, { role: 'user', content: text });

    // ── First Claude call ─────────────────────────────────────────────────────
    const res1 = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 600,
      system,
      tools:      TOOLS,
      messages:   getHistory(allowedUserId),
    });

    const toolBlock = res1.content.find(b => b.type === 'tool_use');

    if (toolBlock) {
      // ── Tool was triggered — execute it for real ───────────────────────────
      console.log(`🔧 Tool call: ${toolBlock.name}`, toolBlock.input);
      const execResult = executeTool(toolBlock.input, snap);

      // Append tool exchange to history so context is preserved
      pushMsg(allowedUserId, { role: 'assistant', content: res1.content });
      pushMsg(allowedUserId, {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: toolBlock.id, content: execResult }],
      });

      // ── Second Claude call — natural confirmation response ─────────────────
      const res2 = await anthropic.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 200,
        system,
        tools:      TOOLS,
        messages:   getHistory(allowedUserId),
      });

      const reply = res2.content.find(b => b.type === 'text')?.text || "Done.";
      pushMsg(allowedUserId, { role: 'assistant', content: reply });
      await bot.sendMessage(allowedUserId, reply);
      console.log(`📤 Benicio (tool): "${reply.replace(/\n/g, ' ')}"`);

    } else {
      // ── Pure conversation — no tool ────────────────────────────────────────
      const reply = res1.content.find(b => b.type === 'text')?.text || "...";
      pushMsg(allowedUserId, { role: 'assistant', content: reply });
      await bot.sendMessage(allowedUserId, reply);
      console.log(`📤 Benicio: "${reply.replace(/\n/g, ' ')}"`);
    }

  } catch (err) {
    console.error("❌ Engine fault:", err);
    await bot.sendMessage(allowedUserId, "⚠️ Engine fault. Check the terminal, Olaf.");
  }
});
