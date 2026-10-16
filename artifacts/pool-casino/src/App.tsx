import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type GameId = "reaction" | "math" | "memory" | "click" | "higher" | "coin";
type Game = { id: GameId; icon: string; name: string; description: string; color: string };
type LeaderboardEntry = { player_name: string; game: GameId; score: number; created_at: string };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const games: Game[] = [
  { id: "reaction", icon: "⚡", name: "Reaction Rush", description: "Test how fast you can react.", color: "from-cyan-500/20 to-blue-500/5" },
  { id: "math", icon: "🧠", name: "Quick Math", description: "Solve as many as you can.", color: "from-violet-500/20 to-fuchsia-500/5" },
  { id: "memory", icon: "🟪", name: "Memory Grid", description: "Remember the sequence.", color: "from-pink-500/20 to-rose-500/5" },
  { id: "click", icon: "🖱️", name: "Click Rush", description: "Build your click streak.", color: "from-emerald-500/20 to-teal-500/5" },
  { id: "higher", icon: "🃏", name: "High Card", description: "Predict the next card. No stakes.", color: "from-amber-500/20 to-orange-500/5" },
  { id: "coin", icon: "🪙", name: "Coin Call", description: "Call heads or tails for points.", color: "from-indigo-500/20 to-sky-500/5" },
];

const makeQuestion = () => {
  const a = 2 + Math.floor(Math.random() * 18);
  const b = 2 + Math.floor(Math.random() * 12);
  const op = Math.random() > 0.5 ? "+" : "×";
  return { text: op === "+" ? a + " + " + b : a + " × " + b, answer: op === "+" ? a + b : a * b };
};

function App() {
  const [selected, setSelected] = useState<GameId>("reaction");
  const [playerId, setPlayerId] = useState("");
  const [dbStatus, setDbStatus] = useState("Connecting to score database…");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [reaction, setReaction] = useState<"idle" | "waiting" | "ready" | "early">("idle");
  const [readyAt, setReadyAt] = useState(0);
  const [reactionResult, setReactionResult] = useState("");
  const [question, setQuestion] = useState(makeQuestion);
  const [answer, setAnswer] = useState("");
  const [mathMessage, setMathMessage] = useState("Solve it to earn 10 points.");
  const [pattern, setPattern] = useState<number[]>([]);
  const [patternVisible, setPatternVisible] = useState(false);
  const [memoryInput, setMemoryInput] = useState<number[]>([]);
  const [memoryMessage, setMemoryMessage] = useState("Start a sequence, then repeat it.");
  const [clickCount, setClickCount] = useState(0);
  const [card, setCard] = useState(2 + Math.floor(Math.random() * 13));
  const [cardMessage, setCardMessage] = useState("Will the next card be higher or lower?");
  const [coinMessage, setCoinMessage] = useState("Call a side. Correct calls earn 5 points.");
  const [rounds, setRounds] = useState(0);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = Number(localStorage.getItem("pool-arcade-best") || "0");
    setBest(Number.isFinite(saved) ? saved : 0);
    let id = localStorage.getItem("pool-arcade-player-id");
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : "player-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("pool-arcade-player-id", id);
    }
    setPlayerId(id);
  }, []);

  async function loadLeaderboard() {
    if (!supabase) {
      setDbStatus("Database not configured");
      return;
    }
    const { data, error } = await supabase
      .from("arcade_scores")
      .select("player_name, game, score, created_at")
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) {
      setDbStatus("Database error: " + error.message);
      return;
    }
    setLeaderboard((data || []) as LeaderboardEntry[]);
    setDbStatus("Connected · scores sync online");
  }

  useEffect(() => {
    if (playerId) void loadLeaderboard();
  }, [playerId]);

  useEffect(() => {
    if (reaction !== "waiting") return;
    reactionTimer.current = setTimeout(() => {
      setReadyAt(Date.now());
      setReaction("ready");
    }, 1200 + Math.random() * 2200);
    return () => { if (reactionTimer.current) clearTimeout(reactionTimer.current); };
  }, [reaction]);

  function award(points: number) {
    const next = score + points;
    setScore(next);
    setBest(old => {
      const updated = Math.max(old, next);
      localStorage.setItem("pool-arcade-best", String(updated));
      return updated;
    });
    if (supabase && playerId) {
      const playerName = "Player-" + playerId.slice(0, 4).toUpperCase();
      void supabase.from("arcade_scores").insert({
        player_id: playerId,
        player_name: playerName,
        game: selected,
        score: next,
      }).then(({ error }) => {
        if (error) setDbStatus("Database error: " + error.message);
        else void loadLeaderboard();
      });
    }
  }

  function chooseGame(id: GameId) {
    setSelected(id);
    setReaction("idle");
    setReactionResult("");
    setAnswer("");
    setMathMessage("Solve it to earn 10 points.");
    setPattern([]);
    setPatternVisible(false);
    setMemoryInput([]);
    setMemoryMessage("Start a sequence, then repeat it.");
    setClickCount(0);
    setCard(2 + Math.floor(Math.random() * 13));
    setCardMessage("Will the next card be higher or lower?");
    setCoinMessage("Call a side. Correct calls earn 5 points.");
    setRounds(0);
  }

  function handleReaction() {
    if (reaction === "idle" || reaction === "early") {
      setReaction("waiting");
      setReactionResult("Wait for the green signal...");
      return;
    }
    if (reaction === "waiting") {
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
      setReaction("early");
      setReactionResult("Too soon! Tap to try again.");
      return;
    }
    const ms = Date.now() - readyAt;
    const points = Math.max(1, Math.round(100 - ms / 5));
    award(points);
    setRounds(r => r + 1);
    setReaction("idle");
    setReactionResult(ms + " ms — +" + points + " points");
  }

  function checkMath() {
    if (Number(answer) === question.answer) {
      award(10);
      setRounds(r => r + 1);
      setMathMessage("Correct! +10 points. Next one:");
      setQuestion(makeQuestion());
      setAnswer("");
    } else {
      setMathMessage("Not quite — try again. No points lost.");
    }
  }

  function startMemory() {
    const next = Array.from({ length: 4 }, () => Math.floor(Math.random() * 9));
    setPattern(next);
    setMemoryInput([]);
    setPatternVisible(true);
    setMemoryMessage("Memorize the order...");
    setTimeout(() => { setPatternVisible(false); setMemoryMessage("Now repeat the sequence."); }, 1700);
  }

  function memoryPick(n: number) {
    if (patternVisible || pattern.length === 0) return;
    const next = [...memoryInput, n];
    setMemoryInput(next);
    if (next[next.length - 1] !== pattern[next.length - 1]) {
      setMemoryMessage("Not quite. Start another sequence whenever you're ready.");
      setPattern([]);
      return;
    }
    if (next.length === pattern.length) {
      award(20);
      setRounds(r => r + 1);
      setMemoryMessage("Perfect memory! +20 points.");
      setPattern([]);
    }
  }

  function guessCard(direction: "higher" | "lower") {
    const next = 2 + Math.floor(Math.random() * 13);
    const correct = direction === "higher" ? next > card : next < card;
    if (correct) {
      award(10);
      setCardMessage("Correct — +10 points!");
    } else {
      setCardMessage("Not this time. No points lost.");
    }
    setCard(next);
    setRounds(r => r + 1);
  }

  function callCoin(side: "Heads" | "Tails") {
    const result = Math.random() > 0.5 ? "Heads" : "Tails";
    if (side === result) {
      award(5);
      setCoinMessage(result + "! Nice call — +5 points.");
    } else {
      setCoinMessage(result + ". No points lost — call again.");
    }
    setRounds(r => r + 1);
  }

  const active = games.find(g => g.id === selected)!;
  const cardName = (n: number) => n === 11 ? "J" : n === 12 ? "Q" : n === 13 ? "K" : n === 14 ? "A" : String(n);

  return (
    <main className="min-h-screen text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#080b12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <button onClick={() => chooseGame("reaction")} className="flex items-center gap-3 text-left">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-xl font-black text-slate-950">P</span>
            <span><span className="block text-lg font-extrabold tracking-tight">POOL<span className="text-cyan-300">ARCADE</span></span><span className="block text-[10px] font-bold uppercase tracking-[.24em] text-slate-500">Play • Practice • Compete</span></span>
          </button>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 sm:block"><span className="text-xs text-slate-400">SESSION SCORE</span><span className="ml-3 font-bold text-cyan-300">{score.toLocaleString()}</span></div>
            <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2"><span className="text-xs text-amber-200">BEST</span><span className="ml-2 font-bold text-amber-100">{best.toLocaleString()}</span></div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-16 pt-10">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#121a2a] via-[#0c111c] to-[#17102b] p-7 sm:p-11">
          <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 right-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative grid gap-8 md:grid-cols-[1.3fr_.7fr] md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-300" /> FREE-TO-PLAY ARCADE</span>
              <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">Small games.<br /><span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">Big brain energy.</span></h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">Jump into quick skill challenges, chase personal bests, and sharpen your reflexes. Every point is just a score — no stakes, no purchases, no cash value.</p>
              <button onClick={() => document.getElementById("game-panel")?.scrollIntoView({ behavior: "smooth" })} className="mt-7 rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-200">Play a game <span aria-hidden="true">↗</span></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><div className="text-3xl">⚡</div><div className="mt-4 text-2xl font-black">6</div><div className="text-sm text-slate-400">Quick challenges</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><div className="text-3xl">🏆</div><div className="mt-4 text-2xl font-black">∞</div><div className="text-sm text-slate-400">Personal bests</div></div>
              <div className="col-span-2 rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-sm font-semibold text-slate-200">Arcade rules</div><div className="mt-1 text-sm text-slate-400">Earn score by playing. You never lose points, and nothing can be bought or cashed out.</div></div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-cyan-300">THE ARCADE</p><h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Pick your challenge</h2></div><span className="text-sm text-slate-500">6 games · free forever</span></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {games.map(game => <button key={game.id} onClick={() => chooseGame(game.id)} className={"group rounded-2xl border p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-cyan-300/40 " + (selected === game.id ? "border-cyan-300/50 bg-cyan-300/[.07] " : "border-white/10 bg-white/[.025] ") + "bg-gradient-to-br " + game.color}>
              <div className="flex items-start justify-between"><span className="text-3xl">{game.icon}</span><span className={"rounded-lg px-2 py-1 text-xs font-bold " + (selected === game.id ? "bg-cyan-300 text-slate-950" : "bg-white/5 text-slate-400")}>{selected === game.id ? "PLAYING" : "PLAY"}</span></div>
              <h3 className="mt-5 text-lg font-bold">{game.name}</h3><p className="mt-1 text-sm text-slate-400">{game.description}</p>
            </button>)}
          </div>
        </section>

        <section id="game-panel" className="mt-8 scroll-mt-24 rounded-3xl border border-white/10 bg-[#0d121d] p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-violet-300">NOW PLAYING</p><h2 className="mt-2 text-2xl font-extrabold">{active.icon} {active.name}</h2><p className="mt-1 text-sm text-slate-400">{active.description}</p></div><div className="rounded-xl bg-white/5 px-4 py-2"><span className="text-xs text-slate-400">SESSION POINTS</span><div className="text-xl font-black text-cyan-300">{score.toLocaleString()}</div></div></div>

          <div className="mx-auto flex min-h-64 max-w-2xl flex-col items-center justify-center py-8 text-center">
            {selected === "reaction" && <div className="w-full"><p className="mb-5 text-slate-300">Tap the panel as soon as it turns green.</p><button onClick={handleReaction} className={"min-h-40 w-full rounded-2xl border text-xl font-extrabold transition " + (reaction === "ready" ? "border-emerald-300 bg-emerald-400 text-slate-950" : reaction === "waiting" ? "border-rose-300/30 bg-rose-500/15 text-rose-100" : "border-white/10 bg-white/5 hover:bg-white/10")}>{reaction === "ready" ? "TAP NOW!" : reaction === "waiting" ? "WAIT FOR GREEN..." : "START REACTION TEST"}</button><p className="mt-4 text-sm text-slate-400">{reactionResult || "Fast reactions earn more points."}</p></div>}

            {selected === "math" && <div className="w-full max-w-md"><p className="text-sm text-slate-400">Solve this problem</p><div className="my-5 text-5xl font-black tracking-tight">{question.text} <span className="text-cyan-300">= ?</span></div><form onSubmit={e => { e.preventDefault(); checkMath(); }} className="flex gap-2"><input autoFocus value={answer} onChange={e => setAnswer(e.target.value)} inputMode="numeric" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-lg outline-none focus:border-cyan-300" placeholder="Your answer" /><button className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950">Check</button></form><p className="mt-4 text-sm text-slate-400">{mathMessage}</p></div>}

            {selected === "memory" && <div className="w-full max-w-md"><p className="mb-5 text-slate-300">{memoryMessage}</p><div className="mx-auto grid max-w-xs grid-cols-3 gap-2">{Array.from({ length: 9 }, (_, n) => <button key={n} onClick={() => memoryPick(n)} className={"aspect-square rounded-xl border text-xl font-bold transition " + (patternVisible && pattern.includes(n) ? "border-violet-300 bg-violet-400/50" : "border-white/10 bg-white/5 hover:bg-violet-400/20")}>{patternVisible && pattern.includes(n) ? pattern.indexOf(n) + 1 : "•"}</button>)}</div><button onClick={startMemory} className="mt-5 rounded-xl bg-violet-300 px-5 py-3 font-bold text-slate-950">Show a new sequence</button></div>}

            {selected === "click" && <div className="w-full max-w-md"><p className="mb-5 text-slate-300">Click as many times as you can, then bank your score. Every click is worth 2 points.</p><button onClick={() => setClickCount(n => n + 1)} className="min-h-36 w-full rounded-2xl border border-emerald-300/30 bg-emerald-300/10 text-4xl font-black transition hover:bg-emerald-300/20 active:scale-[.98]">+ {clickCount}</button><p className="mt-3 text-sm text-slate-400">{clickCount} clicks ready to score</p><button onClick={() => { if (clickCount > 0) { award(clickCount * 2); setRounds(r => r + 1); setClickCount(0); } }} className="mt-4 rounded-xl bg-emerald-300 px-5 py-3 font-bold text-slate-950">Bank points (+{clickCount * 2})</button></div>}

            {selected === "higher" && <div className="w-full max-w-md"><p className="mb-4 text-slate-300">Guess the next card. A correct guess earns 10 points. No points are taken away.</p><div className="mx-auto grid h-40 w-28 place-items-center rounded-2xl border-2 border-white/15 bg-gradient-to-br from-white/10 to-white/5 text-5xl font-black shadow-xl">{cardName(card)}</div><p className="mt-4 text-sm text-slate-400">{cardMessage}</p><div className="mt-4 flex justify-center gap-3"><button onClick={() => guessCard("higher")} className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950">↑ Higher</button><button onClick={() => guessCard("lower")} className="rounded-xl bg-violet-300 px-5 py-3 font-bold text-slate-950">↓ Lower</button></div></div>}

            {selected === "coin" && <div className="w-full max-w-md"><div className="mx-auto grid h-32 w-32 place-items-center rounded-full border-4 border-amber-200/70 bg-gradient-to-br from-amber-200 to-orange-500 text-4xl font-black text-amber-950 shadow-[0_0_55px_rgba(251,191,36,.12)]">?</div><p className="mt-5 text-slate-300">{coinMessage}</p><div className="mt-4 flex justify-center gap-3"><button onClick={() => callCoin("Heads")} className="rounded-xl bg-amber-200 px-5 py-3 font-bold text-amber-950">Heads</button><button onClick={() => callCoin("Tails")} className="rounded-xl bg-orange-300 px-5 py-3 font-bold text-orange-950">Tails</button></div></div>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-500"><span>Points are for fun only and have no monetary value.</span><span>Challenges played this session: {rounds}</span><button onClick={() => { setScore(0); setRounds(0); }} className="rounded-lg border border-white/10 px-3 py-2 text-slate-400 hover:text-white">Reset session score</button></div>
        </section>
        <section className="mt-8 rounded-3xl border border-white/10 bg-[#0c111c] p-6 sm:p-8" aria-labelledby="leaderboard-title">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-300">Community scores</p><h2 id="leaderboard-title" className="mt-1 text-2xl font-extrabold">Arcade leaderboard</h2></div>
            <span className={"rounded-full border px-3 py-1.5 text-xs " + (dbStatus.startsWith("Connected") ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-amber-300/20 bg-amber-300/10 text-amber-200")}>{dbStatus}</span>
          </div>
          {leaderboard.length ? <div className="divide-y divide-white/10">{leaderboard.map((entry, index) => <div key={entry.created_at + entry.player_name + index} className="flex items-center gap-4 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 font-bold text-slate-400">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold text-white">{entry.player_name}</p><p className="text-xs capitalize text-slate-500">{games.find(g => g.id === entry.game)?.name || entry.game}</p></div><span className="font-extrabold tabular-nums text-cyan-300">{Number(entry.score).toLocaleString()} pts</span></div>)}</div> : <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">{dbStatus.startsWith("Connected") ? "No scores yet — play a round and claim the first spot." : "Waiting for the database connection to come online…"}</p>}
          <p className="mt-4 text-xs text-slate-600">Scores are for fun only, have no monetary value, and are stored with a private browser-generated player ID.</p>
        </section>
        <footer className="mt-10 flex flex-col items-center justify-between gap-3 text-center text-xs text-slate-600 sm:flex-row"><span>POOL ARCADE · BUILT FOR PLAY</span><span>No deposits. No wagering. No payouts. Just games.</span></footer>
      </div>
    </main>
  );
}

export default App;
