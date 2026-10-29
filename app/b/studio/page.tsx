/**
 * @module-note app/b/studio/page.tsx
 * 商户端／非遗工作室页面。客户端组件负责状态与交互，数据经接口获取；不要在此放服务端密钥。
 */
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  ENROLLMENT_STATUS_LABELS,
  formatPrice,
  type EnrollmentDto,
  type EnrollmentStatusValue,
  type ExperienceClassDto,
  type StudioWorkDto,
} from "@/features/merchant/types";

type Tab = "works" | "classes" | "enrollments";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "works", label: "作品展厅" },
  { value: "classes", label: "体验课" },
  { value: "enrollments", label: "报名管理" },
];

const ENROLL_ACTIONS: Array<{ value: EnrollmentStatusValue; label: string }> = [
  { value: "CONFIRMED", label: "确认" },
  { value: "ATTENDED", label: "已参加" },
  { value: "CANCELLED", label: "取消" },
];

type WorkForm = {
  id: string | null;
  title: string;
  description: string;
  image: string;
  sortOrder: string;
};

type ClassForm = {
  id: string | null;
  title: string;
  summary: string;
  price: string;
  capacity: string;
  schedule: string;
  location: string;
  image: string;
  status: "DRAFT" | "PUBLISHED";
};

const EMPTY_WORK: WorkForm = { id: null, title: "", description: "", image: "", sortOrder: "0" };
const EMPTY_CLASS: ClassForm = {
  id: null,
  title: "",
  summary: "",
  price: "0",
  capacity: "20",
  schedule: "每周六 14:00-16:00",
  location: "福州市鼓楼区",
  image: "",
  status: "PUBLISHED",
};

/**
 * 渲染商户端／非遗工作室界面及其子组件。
 * 接口协作：/api/merchant/works、/api/merchant/classes、/api/merchant/enrollments${query}、/api/merchant/works/${workForm.id}。
 */
export default function MerchantStudioPage() {
  const [tab, setTab] = useState<Tab>("works");
  const [works, setWorks] = useState<StudioWorkDto[]>([]);
  const [classes, setClasses] = useState<ExperienceClassDto[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([]);
  const [workForm, setWorkForm] = useState<WorkForm>(EMPTY_WORK);
  const [classForm, setClassForm] = useState<ClassForm>(EMPTY_CLASS);
  const [showWorkForm, setShowWorkForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [classFilter, setClassFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadWorks = useCallback(() => {
    fetch("/api/merchant/works")
      .then((r) => r.json())
      .then((p: { data?: StudioWorkDto[]; error?: string }) => {
        if (p.error) throw new Error(p.error);
        setWorks(p.data ?? []);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const loadClasses = useCallback(() => {
    fetch("/api/merchant/classes")
      .then((r) => r.json())
      .then((p: { data?: ExperienceClassDto[]; error?: string }) => {
        if (p.error) throw new Error(p.error);
        setClasses(p.data ?? []);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const loadEnrollments = useCallback(() => {
    const query = classFilter ? `?classId=${classFilter}` : "";
    fetch(`/api/merchant/enrollments${query}`)
      .then((r) => r.json())
      .then((p: { data?: EnrollmentDto[]; error?: string }) => {
        if (p.error) throw new Error(p.error);
        setEnrollments(p.data ?? []);
      })
      .catch((e: Error) => setError(e.message));
  }, [classFilter]);

  useEffect(loadWorks, [loadWorks]);
  useEffect(loadClasses, [loadClasses]);
  useEffect(loadEnrollments, [loadEnrollments]);

  /**
   * 提交非遗作品信息。
   * 接口协作：/api/merchant/works/${workForm.id}、/api/merchant/works。
   * 输入：event；类型与可选项见函数签名。
   */
  async function submitWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch(
      workForm.id ? `/api/merchant/works/${workForm.id}` : "/api/merchant/works",
      {
        method: workForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: workForm.title,
          description: workForm.description,
          image: workForm.image,
          sortOrder: Number(workForm.sortOrder || 0),
        }),
      },
    );
    const payload = (await response.json()) as { error?: string };
    setBusy(false);
    if (response.ok) {
      setShowWorkForm(false);
      setWorkForm(EMPTY_WORK);
      loadWorks();
    } else {
      setError(payload.error ?? "保存失败");
    }
  }

  /**
   * 提交体验课程信息。
   * 接口协作：/api/merchant/classes/${classForm.id}、/api/merchant/classes。
   * 输入：event；类型与可选项见函数签名。
   */
  async function submitClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch(
      classForm.id ? `/api/merchant/classes/${classForm.id}` : "/api/merchant/classes",
      {
        method: classForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: classForm.title,
          summary: classForm.summary,
          price: Number(classForm.price || 0),
          capacity: Number(classForm.capacity || 20),
          schedule: classForm.schedule,
          location: classForm.location,
          image: classForm.image,
          status: classForm.status,
        }),
      },
    );
    const payload = (await response.json()) as { error?: string };
    setBusy(false);
    if (response.ok) {
      setShowClassForm(false);
      setClassForm(EMPTY_CLASS);
      loadClasses();
    } else {
      setError(payload.error ?? "保存失败");
    }
  }

  /**
   * 更新课程报名状态并刷新记录。
   * 接口协作：/api/merchant/enrollments/${id}。
   * 输入：id、value；类型与可选项见函数签名。
   */
  async function updateEnrollment(id: string, value: EnrollmentStatusValue) {
    await fetch(`/api/merchant/enrollments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    loadEnrollments();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">非遗传承人数字工作室</h1>
        <p className="mt-1 text-xs text-stone-500">
          作品线上展厅 + 线上预约体验课；游客在 C 端「非遗学习」报名，这里可以查看和管理
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map((item) => (
          <button
            key={item.value}
            onClick={() => setTab(item.value)}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              tab === item.value
                ? "bg-brand text-white"
                : "bg-white text-stone-600 hover:bg-stone-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-brand">{error}</p>}

      {tab === "works" && (
        <div className="space-y-4">
          <button
            className="btn inline-flex items-center gap-2"
            onClick={() => {
              setWorkForm(EMPTY_WORK);
              setShowWorkForm(true);
            }}
          >
            <Plus size={16} /> 新增作品
          </button>

          {showWorkForm && (
            <form
              onSubmit={submitWork}
              className="grid gap-4 rounded-xl border border-stone-200 bg-white p-5 md:grid-cols-2"
            >
              <label>
                <span className="mb-1 block text-xs text-stone-500">作品名称</span>
                <input
                  className="input"
                  value={workForm.title}
                  onChange={(e) => setWorkForm({ ...workForm, title: e.target.value })}
                  placeholder="如：寿山石雕《梅雀争春》"
                />
              </label>
              <label>
                <span className="mb-1 block text-xs text-stone-500">排序（数字越小越靠前）</span>
                <input
                  className="input"
                  value={workForm.sortOrder}
                  onChange={(e) => setWorkForm({ ...workForm, sortOrder: e.target.value })}
                  inputMode="numeric"
                />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs text-stone-500">作品介绍</span>
                <textarea
                  className="input min-h-20"
                  value={workForm.description}
                  onChange={(e) => setWorkForm({ ...workForm, description: e.target.value })}
                />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs text-stone-500">图片地址（可选）</span>
                <input
                  className="input"
                  value={workForm.image}
                  onChange={(e) => setWorkForm({ ...workForm, image: e.target.value })}
                  placeholder="/images/zhenhailou.jpg"
                />
              </label>
              <div className="flex gap-2 md:col-span-2">
                <button className="btn" type="submit" disabled={busy}>
                  {busy ? "保存中……" : workForm.id ? "保存修改" : "发布作品"}
                </button>
                <button className="btn-ghost" type="button" onClick={() => setShowWorkForm(false)}>
                  取消
                </button>
              </div>
            </form>
          )}

          {works.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {works.map((work) => (
                <article
                  key={work.id}
                  className="overflow-hidden rounded-xl border border-stone-200 bg-white"
                >
                  <div
                    className="h-32 bg-stone-100 bg-cover bg-center"
                    style={{
                      backgroundImage: `url('${work.image || "/images/zhenhailou.jpg"}')`,
                    }}
                  />
                  <div className="space-y-2 p-4">
                    <h3 className="font-serif text-base font-semibold">{work.title}</h3>
                    <p className="line-clamp-3 text-xs text-stone-500">{work.description}</p>
                    <div className="flex gap-2 pt-1">
                      <button
                        className="btn-ghost inline-flex flex-1 items-center justify-center gap-1 py-1.5 text-xs"
                        onClick={() => {
                          setWorkForm({
                            id: work.id,
                            title: work.title,
                            description: work.description,
                            image: work.image ?? "",
                            sortOrder: String(work.sortOrder),
                          });
                          setShowWorkForm(true);
                        }}
                      >
                        <Pencil size={13} /> 编辑
                      </button>
                      <button
                        className="btn-ghost inline-flex items-center justify-center px-3 py-1.5 text-brand"
                        onClick={async () => {
                          await fetch(`/api/merchant/works/${work.id}`, { method: "DELETE" });
                          loadWorks();
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-400">
              还没有作品，先发布一件到线上展厅吧。
            </div>
          )}
        </div>
      )}

      {tab === "classes" && (
        <div className="space-y-4">
          <button
            className="btn inline-flex items-center gap-2"
            onClick={() => {
              setClassForm(EMPTY_CLASS);
              setShowClassForm(true);
            }}
          >
            <Plus size={16} /> 新增体验课
          </button>

          {showClassForm && (
            <form
              onSubmit={submitClass}
              className="grid gap-4 rounded-xl border border-stone-200 bg-white p-5 md:grid-cols-2"
            >
              <label>
                <span className="mb-1 block text-xs text-stone-500">课程名称</span>
                <input
                  className="input"
                  value={classForm.title}
                  onChange={(e) => setClassForm({ ...classForm, title: e.target.value })}
                  placeholder="如：寿山石雕入门体验课"
                />
              </label>
              <label>
                <span className="mb-1 block text-xs text-stone-500">上课时间</span>
                <input
                  className="input"
                  value={classForm.schedule}
                  onChange={(e) => setClassForm({ ...classForm, schedule: e.target.value })}
                />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs text-stone-500">课程简介</span>
                <input
                  className="input"
                  value={classForm.summary}
                  onChange={(e) => setClassForm({ ...classForm, summary: e.target.value })}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs text-stone-500">价格（元）</span>
                <input
                  className="input"
                  value={classForm.price}
                  onChange={(e) => setClassForm({ ...classForm, price: e.target.value })}
                  inputMode="decimal"
                />
              </label>
              <label>
                <span className="mb-1 block text-xs text-stone-500">名额</span>
                <input
                  className="input"
                  value={classForm.capacity}
                  onChange={(e) => setClassForm({ ...classForm, capacity: e.target.value })}
                  inputMode="numeric"
                />
              </label>
              <label>
                <span className="mb-1 block text-xs text-stone-500">地点（可选）</span>
                <input
                  className="input"
                  value={classForm.location}
                  onChange={(e) => setClassForm({ ...classForm, location: e.target.value })}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs text-stone-500">上架状态</span>
                <select
                  className="input"
                  value={classForm.status}
                  onChange={(e) =>
                    setClassForm({ ...classForm, status: e.target.value as "DRAFT" | "PUBLISHED" })
                  }
                >
                  <option value="PUBLISHED">上架（C 端可报名）</option>
                  <option value="DRAFT">草稿</option>
                </select>
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs text-stone-500">图片地址（可选）</span>
                <input
                  className="input"
                  value={classForm.image}
                  onChange={(e) => setClassForm({ ...classForm, image: e.target.value })}
                  placeholder="/images/molihua.jpg"
                />
              </label>
              <div className="flex gap-2 md:col-span-2">
                <button className="btn" type="submit" disabled={busy}>
                  {busy ? "保存中……" : classForm.id ? "保存修改" : "发布课程"}
                </button>
                <button className="btn-ghost" type="button" onClick={() => setShowClassForm(false)}>
                  取消
                </button>
              </div>
            </form>
          )}

          {classes.length ? (
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full min-w-[44rem] text-xs">
                <thead className="bg-stone-50 text-stone-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-normal">课程</th>
                    <th className="px-4 py-3 text-left font-normal">时间</th>
                    <th className="px-4 py-3 text-right font-normal">价格</th>
                    <th className="px-4 py-3 text-right font-normal">报名/名额</th>
                    <th className="px-4 py-3 text-center font-normal">状态</th>
                    <th className="px-4 py-3 text-right font-normal">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((item) => (
                    <tr key={item.id} className="border-t border-stone-100">
                      <td className="px-4 py-3">
                        <span className="font-medium">{item.title}</span>
                        <p className="mt-1 max-w-xs text-[12.1px] text-stone-400">{item.summary}</p>
                      </td>
                      <td className="px-4 py-3 text-stone-500">{item.schedule}</td>
                      <td className="px-4 py-3 text-right">{formatPrice(item.price)}</td>
                      <td className="px-4 py-3 text-right">
                        {item.enrollmentCount}/{item.capacity}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={item.status === "PUBLISHED" ? "text-tea" : "text-stone-400"}>
                          {item.status === "PUBLISHED" ? "已上架" : "草稿"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            className="btn-ghost py-1 text-xs"
                            onClick={async () => {
                              await fetch(`/api/merchant/classes/${item.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  status: item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                                }),
                              });
                              loadClasses();
                            }}
                          >
                            {item.status === "PUBLISHED" ? "下架" : "上架"}
                          </button>
                          <button
                            className="btn-ghost inline-flex items-center px-3 py-1"
                            onClick={() => {
                              setClassForm({
                                id: item.id,
                                title: item.title,
                                summary: item.summary,
                                price: (item.price / 100).toString(),
                                capacity: String(item.capacity),
                                schedule: item.schedule,
                                location: item.location ?? "",
                                image: item.image ?? "",
                                status: item.status,
                              });
                              setShowClassForm(true);
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="btn-ghost inline-flex items-center px-3 py-1 text-brand"
                            onClick={async () => {
                              await fetch(`/api/merchant/classes/${item.id}`, { method: "DELETE" });
                              loadClasses();
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-400">
              还没有体验课，先发布一门吧。
            </div>
          )}
        </div>
      )}

      {tab === "enrollments" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-stone-500">按课程筛选</label>
            <select
              className="input max-w-xs"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">全部课程</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          {enrollments.length ? (
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full min-w-[40rem] text-xs">
                <thead className="bg-stone-50 text-stone-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-normal">游客</th>
                    <th className="px-4 py-3 text-left font-normal">课程</th>
                    <th className="px-4 py-3 text-left font-normal">联系方式</th>
                    <th className="px-4 py-3 text-center font-normal">状态</th>
                    <th className="px-4 py-3 text-right font-normal">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((item) => (
                    <tr key={item.id} className="border-t border-stone-100">
                      <td className="px-4 py-3">{item.user.nickname || item.user.username}</td>
                      <td className="px-4 py-3 text-stone-500">{item.class.title}</td>
                      <td className="px-4 py-3 text-stone-500">{item.contact || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {ENROLLMENT_STATUS_LABELS[item.status]}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {ENROLL_ACTIONS.map((action) => (
                            <button
                              key={action.value}
                              className="btn-ghost px-3 py-1 text-xs"
                              disabled={item.status === action.value}
                              onClick={() => updateEnrollment(item.id, action.value)}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-400">
              暂无报名记录。游客在 C 端「非遗学习」报名后会出现在这里。
            </div>
          )}
        </div>
      )}
    </div>
  );
}
