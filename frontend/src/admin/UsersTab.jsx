import { useCallback, useEffect, useState } from "react";
import {
  Search,
  ShieldCheck,
  ShieldOff,
  Ban,
  RotateCcw,
  Wallet,
  Crown,
  X,
} from "lucide-react";
import { adminApi } from "../api/adminClient";
import UserDetailDrawer from "./UserDetailDrawer";
import {
  Card,
  SectionHeader,
  Pill,
  Button,
  TextInput,
  Select,
  Empty,
  formatDay,
} from "./ui";

const PAGE_SIZE = 25;

export default function UsersTab() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [scope, setScope] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [creditDrawer, setCreditDrawer] = useState(null);
  const [detailUserId, setDetailUserId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await adminApi.listUsers({
        limit: PAGE_SIZE,
        offset,
        scope,
        q,
      });
      setRows(res.rows || []);
      setTotal(res.total || 0);
    } catch (e) {
      setErr(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [offset, scope, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(u) {
    try {
      await adminApi.setUserActive(u.id, !u.is_active);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function toggleAdmin(u) {
    const next = !u.is_admin;
    const ok = window.confirm(
      next
        ? `Grant admin access to ${u.email}?`
        : `Revoke admin access from ${u.email}?`
    );
    if (!ok) return;
    try {
      await adminApi.setUserAdmin(u.id, next);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Users"
        description="Everyone registered on the platform. Filter by subscription status or search by name / email."
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <TextInput
            type="search"
            placeholder="Search name or email"
            value={q}
            onChange={(e) => {
              setOffset(0);
              setQ(e.target.value);
            }}
            className="pl-9 w-72"
          />
        </div>
        <Select
          value={scope}
          onChange={(e) => {
            setOffset(0);
            setScope(e.target.value);
          }}
        >
          <option value="all">All users</option>
          <option value="paid">Paid subscribers</option>
          <option value="free">Free tier</option>
          <option value="admins">Admins only</option>
        </Select>
        <div className="ml-auto text-xs text-slate-500">
          {total.toLocaleString("en-IN")} total
        </div>
      </div>

      {err ? (
        <Card className="p-3 text-sm text-red-300 border-red-900/50 bg-red-950/30">
          {err}
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Plan</th>
                <th className="text-left px-4 py-3 font-medium">Credits</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading && !rows.length ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500 text-sm">
                    Loading users…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <Empty title="No users match your filters" />
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    onToggleActive={toggleActive}
                    onToggleAdmin={toggleAdmin}
                    onAdjustCredits={() => setCreditDrawer(u)}
                    onOpenDetail={() => setDetailUserId(u.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Showing {rows.length ? offset + 1 : 0}–{offset + rows.length} of{" "}
            {total.toLocaleString("en-IN")}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {creditDrawer ? (
        <CreditAdjustDrawer
          user={creditDrawer}
          onClose={() => setCreditDrawer(null)}
          onSaved={() => {
            setCreditDrawer(null);
            load();
          }}
        />
      ) : null}

      {detailUserId ? (
        <UserDetailDrawer
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
        />
      ) : null}
    </div>
  );
}

function UserRow({ user: u, onToggleActive, onToggleAdmin, onAdjustCredits, onOpenDetail }) {
  const profile = u.profiles || {};
  const sub = u.active_sub;
  return (
    <tr className="hover:bg-slate-900/40">
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={onOpenDetail}
          className="flex items-center gap-3 text-left w-full hover:opacity-90"
          title="Open user detail"
        >
          {profile.main_image_url ? (
            <img
              src={profile.main_image_url}
              alt=""
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
              {(u.name || u.email || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-100 truncate flex items-center gap-1.5 hover:text-pink-300">
              {u.name}
              {u.is_admin ? (
                <Crown className="w-3.5 h-3.5 text-amber-300" />
              ) : null}
            </div>
            <div className="text-xs text-slate-500 truncate">{u.email}</div>
          </div>
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {u.is_active ? (
            <Pill tone="green">Active</Pill>
          ) : (
            <Pill tone="red">Disabled</Pill>
          )}
          {profile.is_verified ? (
            <Pill tone="blue">Verified</Pill>
          ) : profile.verification_status === "pending" ? (
            <Pill tone="amber">Pending</Pill>
          ) : null}
          {!profile.is_complete ? (
            <Pill tone="slate">Incomplete</Pill>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3">
        {sub ? (
          <Pill tone={sub.tier === "pro" ? "pink" : "blue"}>
            {sub.tier?.toUpperCase()} · {sub.plan.replace(/_/, " ")}
          </Pill>
        ) : (
          <span className="text-xs text-slate-500">Free</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-slate-200">
        {(u.credit_balance ?? 0).toLocaleString("en-IN")}
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">{formatDay(u.created_at)}</td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            title="Adjust credits"
            onClick={onAdjustCredits}
          >
            <Wallet className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title={u.is_admin ? "Revoke admin" : "Grant admin"}
            onClick={() => onToggleAdmin(u)}
          >
            {u.is_admin ? (
              <ShieldOff className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title={u.is_active ? "Disable account" : "Re-enable account"}
            onClick={() => onToggleActive(u)}
          >
            {u.is_active ? (
              <Ban className="w-3.5 h-3.5 text-red-300" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-emerald-300" />
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
}

function CreditAdjustDrawer({ user, onClose, onSaved }) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    const n = Number(delta);
    if (!Number.isFinite(n) || n === 0) {
      setErr("Enter a non-zero number (use a minus sign to deduct)");
      return;
    }
    if (!reason.trim()) {
      setErr("Reason is required — it's written to the audit log");
      return;
    }
    setBusy(true);
    try {
      await adminApi.adjustCredits(user.id, n, reason.trim());
      onSaved?.();
    } catch (e2) {
      setErr(e2.message || "Adjustment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <Card
        className="w-full max-w-md bg-slate-950 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-500">
              Credit adjustment
            </div>
            <div className="text-base font-semibold">{user.name}</div>
            <div className="text-xs text-slate-500">
              Current balance: {(user.credit_balance ?? 0).toLocaleString("en-IN")} credits
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="text-xs text-slate-400">Delta (positive = credit, negative = debit)</span>
            <TextInput
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="e.g. 50 or -30"
              className="w-full mt-1"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Reason</span>
            <TextInput
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Goodwill refund after support ticket #123"
              className="w-full mt-1"
            />
          </label>

          {err ? (
            <div className="text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
              {err}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Apply adjustment"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
