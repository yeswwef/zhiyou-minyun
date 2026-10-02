"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

type TripItem = { resourceId: string; title: string; day?: number };
type Trip = {
  id: string;
  title: string;
  durationDays: number | null;
  startDate: string | null;
  items: TripItem[];
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  function load() {
    fetch("/api/trips")
      .then((response) => response.json())
      .then((payload: { data?: Trip[]; loggedIn?: boolean }) => {
        setTrips(payload.data ?? []);
        setLoggedIn(!!payload.loggedIn);
      })
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function createTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    const response = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        durationDays: Number(duration) || null,
      }),
    });
    setCreating(false);
    if (response.ok) {
      setTitle("");
      setDuration("");
      load();
    }
  }

  async function removeTrip(id: string) {
    const response = await fetch(`/api/trips/${id}`, { method: "DELETE" });
    if (response.ok) load();
  }

  async function saveTitle(id: string) {
    if (!editingTitle.trim()) return;
    const response = await fetch(`/api/trips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editingTitle.trim() }),
    });
    if (response.ok) {
      setEditingId(null);
      load();
    }
  }

  async function removeItem(tripId: string, resourceId: string) {
    const trip = trips.find((item) => item.id === tripId);
    if (!trip) return;
    const items = trip.items.filter((item) => item.resourceId !== resourceId);
    const response = await fetch(`/api/trips/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (response.ok) load();
  }

  return (
    <>
      <div className="profile-page-head">
        <div>
          <h1>我的行程</h1>
          <p>把想去的地方串成一段好时光，行程可随时增删改。</p>
        </div>
        <Link href="/resources" className="profile-head-link">
          去资源中心添加地点
        </Link>
      </div>

      <div className="profile-page-body">
        <form className="trip-create" onSubmit={createTrip}>
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="行程标题，如：福州三日游"
          />
          <input
            className="input"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            placeholder="天数（可选）"
            inputMode="numeric"
          />
          <button className="btn" type="submit" disabled={creating || !title.trim()}>
            新建行程
          </button>
        </form>

        {loading ? (
          <div className="profile-empty">正在加载行程……</div>
        ) : !loggedIn ? (
          <div className="profile-empty">
            请先 <Link href="/login">登录</Link> 后管理行程。
          </div>
        ) : trips.length ? (
          <div className="trip-list">
            {trips.map((trip) => (
              <div className="trip-card" key={trip.id}>
                <div className="trip-card-head">
                  {editingId === trip.id ? (
                    <div className="trip-edit-row">
                      <input
                        className="input"
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        autoFocus
                      />
                      <button className="btn" onClick={() => saveTitle(trip.id)}>
                        保存
                      </button>
                      <button className="btn-ghost" onClick={() => setEditingId(null)}>
                        取消
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="trip-title-wrap">
                        <h3>{trip.title}</h3>
                        <span className="trip-meta">
                          {trip.durationDays ? (
                            <span>
                              <Clock3 size={13} /> {trip.durationDays} 天
                            </span>
                          ) : null}
                          {trip.startDate ? (
                            <span>
                              <CalendarDays size={13} /> {trip.startDate.slice(0, 10)}
                            </span>
                          ) : null}
                          <span>
                            <MapPin size={13} /> {trip.items.length} 个地点
                          </span>
                        </span>
                      </div>
                      <div className="trip-actions">
                        <button
                          className="icon-btn"
                          onClick={() => {
                            setEditingId(trip.id);
                            setEditingTitle(trip.title);
                          }}
                          aria-label="重命名"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => setExpanded(expanded === trip.id ? null : trip.id)}
                          aria-label="查看地点"
                        >
                          {expanded === trip.id ? <X size={15} /> : <MapPin size={15} />}
                        </button>
                        <button
                          className="icon-btn danger"
                          onClick={() => removeTrip(trip.id)}
                          aria-label="删除"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {expanded === trip.id && (
                  <div className="trip-items">
                    {trip.items.length ? (
                      trip.items.map((item, index) => (
                        <div className="trip-item" key={`${item.resourceId}-${index}`}>
                          <Link href={`/resources/${item.resourceId}`}>{item.title}</Link>
                          <button
                            className="icon-btn danger"
                            onClick={() => removeItem(trip.id, item.resourceId)}
                            aria-label="移除"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="trip-empty">还没有添加地点，去资源中心挑几个吧。</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="profile-empty">还没有行程，先创建一个吧。</div>
        )}
      </div>
    </>
  );
}
