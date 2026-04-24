import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { adminApi } from "../api/adminClient";
import { Card, SectionHeader, Button, TextInput, Empty } from "./ui";

export default function SettingsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [drafts, setDrafts] = useState({});

  async function load() {
    setLoading(true);
    try {
      const res = await adminApi.listSettings();
      setRows(res || []);
      setDrafts({});
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(row) {
    const draft = drafts[row.key];
    if (draft === undefined) return;
    let value = draft;
    // Try to parse JSON so numeric settings stay numeric. If it fails,
    // fall back to the raw string (the backend accepts `Any`).
    try {
      value = JSON.parse(draft);
    } catch {
      /* keep as string */
    }
    try {
      await adminApi.updateSetting(row.key, value);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Settings & Commission"
        description="Platform tunables — payout rate, commission share, withdrawal floor. Values are JSON; numbers without quotes."
      />

      {err ? (
        <Card className="p-3 text-sm text-red-300 border-red-900/50 bg-red-950/30">
          {err}
        </Card>
      ) : null}

      {loading ? (
        <Card className="p-10 text-center text-sm text-slate-500">Loading settings…</Card>
      ) : !rows.length ? (
        <Card>
          <Empty
            title="No settings defined"
            description="Run the 2026_admin migration to seed the defaults."
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-800">
            {rows.map((r) => {
              const current = drafts[r.key] ?? JSON.stringify(r.value);
              const dirty = drafts[r.key] !== undefined;
              return (
                <div key={r.key} className="px-5 py-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[220px]">
                    <div className="text-sm font-medium text-white font-mono">{r.key}</div>
                    {r.description ? (
                      <div className="text-xs text-slate-500 mt-0.5 max-w-xl">
                        {r.description}
                      </div>
                    ) : null}
                  </div>
                  <TextInput
                    value={current}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [r.key]: e.target.value }))
                    }
                    className="w-52 font-mono"
                  />
                  <Button
                    variant={dirty ? "primary" : "outline"}
                    size="sm"
                    disabled={!dirty}
                    onClick={() => save(r)}
                  >
                    <Save className="w-3.5 h-3.5" /> Save
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
