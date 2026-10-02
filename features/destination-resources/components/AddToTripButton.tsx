"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Route } from "lucide-react";

type Trip = {
  id: string;
  title: string;
  items: Array<{ resourceId: string; title: string }>;
};

export function AddToTripButton({
  resourceId,
  title,
}: {
  resourceId: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loggedIn, setLoggedIn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/trips")
      .then((response) => response.json())
      .then((payload: { data?: Trip[]; loggedIn?: boolean }) => {
        setLoggedIn(!!payload.loggedIn);
        setTrips(payload.data ?? []);
      })
      .catch(() => setTrips([]));
  }, [open]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function addToTrip(tripId: string) {
    const trip = trips.find((item) => item.id === tripId);
    if (!trip) return;
    setBusy(true);
    const items = [...trip.items, { resourceId, title }];
    const response = await fetch(`/api/trips/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setBusy(false);
    if (response.status === 401) {
      router.push("/login");
      return;
    }
    if (response.ok) {
      setMessage("已加入行程");
      setOpen(false);
    }
  }

  async function createAndAdd() {
    setBusy(true);
    const response = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `${title} 之旅`, items: [{ resourceId, title }] }),
    });
    setBusy(false);
    if (response.status === 401) {
      router.push("/login");
      return;
    }
    if (response.ok) {
      setMessage("已新建行程并加入");
      setOpen(false);
    }
  }

  return (
    <div className="add-trip-wrap" ref={wrapRef}>
      <button
        className="detail-action"
        onClick={() => setOpen((value) => !value)}
      >
        <Route size={16} />
        加入行程
      </button>

      {open && (
        <div className="add-trip-pop">
          <p className="add-trip-title">选择要加入的行程</p>
          {busy ? (
            <p className="add-trip-loading">处理中……</p>
          ) : !loggedIn ? (
            <p className="add-trip-empty">
              请先 <Link href="/login">登录</Link>
            </p>
          ) : (
            <>
              {trips.length ? (
                trips.map((trip) => (
                  <button
                    key={trip.id}
                    className="add-trip-option"
                    onClick={() => addToTrip(trip.id)}
                  >
                    {trip.title}
                    <small>{trip.items.length} 个地点</small>
                  </button>
                ))
              ) : (
                <p className="add-trip-empty">还没有行程</p>
              )}
              <button className="add-trip-create" onClick={createAndAdd}>
                + 新建行程并加入
              </button>
            </>
          )}
        </div>
      )}

      {message && <span className="add-trip-toast">{message}</span>}
    </div>
  );
}
