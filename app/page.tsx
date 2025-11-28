"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, PlusCircle, Trash2, Settings, ShieldCheck, TerminalSquare, Edit3, Eye, X } from "lucide-react";

const TABLES = ["filter", "nat"
  // , "mangle"

];
const CHAINS = ["INPUT", "OUTPUT",
  "FORWARD", "PREROUTING", "POSTROUTING"
];

export default function Home() {
  const [table, setTable] = useState("filter");
  const [chain, setChain] = useState("INPUT");

  // Rule builder fields
  const [protocol, setProtocol] = useState("tcp");
  const [sport, setSport] = useState("");
  const [port, setPort] = useState("");
  const [srcIp, setSrcIp] = useState("");
  const [dstIp, setDstIp] = useState("");
  const [inIf, setInIf] = useState("");
  const [outIf, setOutIf] = useState("");
  const [action, setAction] = useState("ACCEPT");
  const [comment, setComment] = useState("");
  const [natTo, setNatTo] = useState("");


  const [rules, setRules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [inspectorRule, setInspectorRule] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ line: string; text: string } | null>(null);

  async function loadRules() {
    setLoading(true);
    try {
      const res = await invoke<string>("fw_list_rules", { table, chain });
      const lines = res.split("\n").filter(Boolean);
      setRules(lines.slice(2).map((l) => l.trim()).filter(Boolean));
      setMsg(`Loaded ${Math.max(0, lines.length - 2)} rules`);
    } catch (e) {
      setMsg("Error: " + String(e));
    }
    setLoading(false);
  }

  async function addRule() {
    let rule = `-p ${protocol}`;
    if (srcIp) rule += ` -s ${srcIp}`;
    if (dstIp) rule += ` -d ${dstIp}`;
    if (sport) rule += ` --sport ${sport}`;
    if (port) rule += ` --dport ${port}`;
    if (inIf) rule += ` -i ${inIf}`;
    if (outIf) rule += ` -o ${outIf}`;
    if (comment) rule += ` -m comment --comment "${comment}"`;
    if (action === "DNAT") rule += ` -j DNAT --to-destination ${natTo}`;
    else if (action === "SNAT") rule += ` -j SNAT --to-source ${natTo}`;
    else if (action === "MASQUERADE") rule += " -j MASQUERADE";
    else rule += ` -j ${action}`;


    try {
      await invoke("fw_add_rule", { table, chain, rule });
      setMsg("Rule added.");
      // optimistically clear some fields
      setComment("");
      setPort("");
      setSport("");
      loadRules();
    } catch (err) {
      setMsg("Error: " + String(err));
    }
  }

  async function deleteRule(line: string) {
    try {
      await invoke("fw_delete_rule", { table, chain, line });
      setMsg("Rule deleted.");
      loadRules();
    } catch (err) {
      setMsg("Error: " + String(err));
    }
  }

  async function toggleRuleAction(line: string) {
    setInspectorRule(line);
  }

  useEffect(() => {
    loadRules();
  }, [table, chain]);

  return (
    <div className="min-h-screen p-6 space-y-8 bg-gradient-to-br from-black via-gray-900 to-gray-800 text-gray-100">

      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold inline-flex items-center gap-3">
          <ShieldCheck className="text-blue-400" />
          <span>CocoTap Console</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">Interactive Linux firewall manager — designed for developers & ops</p>
      </motion.header>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex gap-3 items-center bg-gray-800/40 px-4 py-3 rounded-2xl border border-gray-700 shadow-md backdrop-blur">
          <Settings className="opacity-70" />
          <select className="appearance-none px-3 py-2 rounded-lg bg-gray-900 text-gray-200 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={table}
            onChange={(e) => setTable(e.target.value)}
          >
            {TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <select className="appearance-none px-3 py-2 rounded-lg bg-gray-900 text-gray-200 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={chain}
            onChange={(e) => setChain(e.target.value)}
          >
            {CHAINS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <button onClick={loadRules} className="px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-semibold shadow-sm flex items-center gap-2" disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Refreshing..." : "Reload"}</span>
          </button>
        </div>

        <div className="flex gap-3 items-center">
          <div className="text-xs text-gray-300">Table:</div>
          <div className="px-3 py-1 rounded-full bg-gray-800/30 border border-gray-700 text-sm">{table}</div>
          <div className="text-xs text-gray-300">Chain:</div>
          <div className="px-3 py-1 rounded-full bg-gray-800/30 border border-gray-700 text-sm">{chain}</div>
        </div>
      </div>

      {/* Rule Editor */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 border border-gray-700 rounded-2xl bg-gray-900/50 backdrop-blur-xl shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold inline-flex items-center gap-2">
            <PlusCircle className="text-green-400" /> Create Rule
          </h2>

          <div className="text-sm text-gray-300">Quick actions</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4  gap-3 mt-4">
          <input className="px-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="Protocol (tcp/udp)" value={protocol} onChange={(e) => setProtocol(e.target.value)} />
          <input className="px-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="Source IP" value={srcIp} onChange={(e) => setSrcIp(e.target.value)} />
          <input className="px-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="Destination IP" value={dstIp} onChange={(e) => setDstIp(e.target.value)} />
          <select className="appearance-none px-3 py-2 rounded-lg bg-gray-900 text-gray-200 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option>ACCEPT</option>
            <option>REJECT</option>
            <option>DROP</option>

            {/*Under Test*/}
            {
              table === "nat" && (
                <>
                  <option>DNAT</option>
                  <option>SNAT</option>
                  <option>MASQUERADE</option></>
              )
            }
          </select>

          <input className="px-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="Source Port" value={sport} onChange={(e) => setSport(e.target.value)} />
          <input className="px-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="Destination Port" value={port} onChange={(e) => setPort(e.target.value)} />
          <input className="px-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="In Interface (eth0)" value={inIf} onChange={(e) => setInIf(e.target.value)} />
          <input className="px-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="Out Interface" value={outIf} onChange={(e) => setOutIf(e.target.value)} />
          {(action === "DNAT" || action === "SNAT") && (
            <input
              className="px-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700 text-gray-200"
              placeholder={action === "DNAT" ? "To Destination (IP:Port)" : "To Source (IP)"}
              value={natTo}
              onChange={(e) => setNatTo(e.target.value)}
            />
          )}

          <input className="px-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 col-span-full md:col-span-2" placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />

          <div className="flex gap-2 md:col-span-2 justify-end">
            <button className="px-3 py-2 rounded-lg hover:bg-blue-600 text-white font-semibold shadow-sm bg-gray-700/60" onClick={() => { setProtocol('tcp'); setSport(''); setPort(''); setSrcIp(''); setDstIp(''); setInIf(''); setOutIf(''); setComment(''); setAction('ACCEPT'); }}>
              Reset
            </button>
            <button className="flex flex-col justify-center items-center px-3 py-2 rounded-lg text-white font-semibold shadow-sm bg-green-600 hover:bg-green-500" onClick={addRule}><PlusCircle /> Apply</button>
          </div>
        </div>
      </motion.section>

      {/* Rules list */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold inline-flex items-center gap-2">
          <TerminalSquare className="text-blue-400" /> Active Rules
        </h2>

        <div className="grid gap-3">
          {rules.length === 0 && (
            <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700 text-gray-400">No rules found.</div>
          )}

          {rules.map((r, i) => {
            const number = r.split(/\s+/)[0];
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.01 }} className="p-4 bg-gradient-to-r from-gray-800/40 to-gray-800/25 rounded-xl border border-gray-700 shadow-md flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-300/80 px-2 py-1 rounded bg-gray-900/40 font-mono">#{number}</div>
                    <div className="font-mono text-sm break-words">{r}</div>
                  </div>

                  <div className="mt-2 text-xs text-gray-400">Chain: <span className="font-medium text-gray-200">{chain}</span> · Table: <span className="font-medium text-gray-200">{table}</span></div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <button title="Inspect rule" onClick={() => setInspectorRule(r)} className="px-3 py-2 rounded-md bg-gray-800/50 border border-gray-700 hover:bg-gray-800/60">
                      <Eye />
                    </button>



                    <button title="Delete" onClick={() => setConfirmDelete({ line: number, text: r })} className="px-3 py-2 rounded-md bg-red-700/10 text-red-300 border border-red-600 hover:bg-red-700/10">
                      <Trash2 />
                    </button>
                  </div>

                  <div className="text-xs text-gray-400">Actions</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Inspector drawer */}
      <AnimatePresence>
        {inspectorRule && (
          <motion.aside initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} transition={{ type: 'spring' }} className="fixed right-6 top-12 w-full md:w-96 h-[80vh] bg-gray-900/90 border border-gray-700 rounded-2xl p-4 shadow-2xl backdrop-blur z-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Rule inspector</h3>
              <button onClick={() => setInspectorRule(null)} className="p-2 rounded hover:bg-gray-800/30">
                <X />
              </button>
            </div>

            <pre className="mt-4 p-3 rounded bg-gray-800/40 overflow-auto text-sm font-mono" style={{ maxHeight: '65%' }}>{inspectorRule}</pre>

            <div className="mt-4 flex gap-2 justify-end">
              <button className="px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-semibold shadow-sm" onClick={() => { navigator.clipboard?.writeText(inspectorRule || ''); setMsg('Copied to clipboard'); }}>
                Copy
              </button>
              <button className="px-3 py-2 rounded-lg  hover:bg-blue-600 text-white font-semibold shadow-sm bg-red-700/70" onClick={() => { if (inspectorRule) setConfirmDelete({ line: inspectorRule.split(/\s+/)[0], text: inspectorRule }); }}>
                Delete
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>



      {/* Confirm delete modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} exit={{ scale: 0.98 }} className="w-full max-w-md bg-gray-900 rounded-2xl p-6 border border-red-600 shadow-2xl">
              <h4 className="text-lg font-semibold text-red-300">Confirm delete</h4>
              <p className="mt-2 text-sm text-gray-300">Delete rule <span className="font-mono bg-gray-800/50 px-2 py-1 rounded">#{confirmDelete.line}</span> ? This operation is destructive.</p>

              <div className="mt-4 flex justify-end gap-2">
                <button className="px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-semibold shadow-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="px-3 py-2 rounded-lg  hover:bg-blue-600 text-white font-semibold shadow-sm bg-red-700" onClick={() => { deleteRule(confirmDelete.line); setConfirmDelete(null); setInspectorRule(null); }}>
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer message */}
      {msg && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed left-6 bottom-6 bg-gray-900/80 border border-gray-700 px-4 py-2 rounded-lg text-sm shadow-lg">
          {msg}
        </motion.div>
      )}
    </div>
  );
}
