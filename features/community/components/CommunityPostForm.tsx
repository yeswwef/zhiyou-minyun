"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, MapPin, Star, Trash2 } from "lucide-react";
import type {
  CommunityPostDto,
  CommunityPostTypeValue,
  CommunityResourceOption,
} from "../types";
import { resourceTypeLabel } from "../types";

type ImageItem =
  | { id: string; kind: "existing"; url: string }
  | { id: string; kind: "new"; url: string; file: File };

export function CommunityPostForm({
  resources,
  initialType,
  initialResourceId,
  initialPost,
}: {
  resources: CommunityResourceOption[];
  initialType: CommunityPostTypeValue;
  initialResourceId?: string;
  initialPost?: CommunityPostDto;
}) {
  const router = useRouter();
  const [type, setType] = useState<CommunityPostTypeValue>(initialPost?.type ?? initialType);
  const [resourceId, setResourceId] = useState(initialPost?.resource.slug ?? initialResourceId ?? "");
  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [content, setContent] = useState(initialPost?.content ?? "");
  const [rating, setRating] = useState(initialPost?.rating ?? 0);
  const [visitedAt, setVisitedAt] = useState(initialPost?.visitedAt?.slice(0, 10) ?? "");
  const [images, setImages] = useState<ImageItem[]>(
    initialPost?.images.map((image) => ({ id: image.id, kind: "existing", url: image.imageUrl })) ?? [],
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [existingReview, setExistingReview] = useState<{ resourceId: string; postId: string | null } | null>(null);
  const reviewLookupResourceId = !initialPost && type === "REVIEW" ? resourceId : "";
  const existingReviewId = existingReview?.resourceId === reviewLookupResourceId
    ? existingReview.postId
    : null;

  const groupedResources = useMemo(
    () => (["SCENIC", "ICH", "FOOD"] as const).map((resourceType) => ({
      type: resourceType,
      items: resources.filter((resource) => resource.type === resourceType),
    })),
    [resources],
  );

  useEffect(() => {
    if (!reviewLookupResourceId) return;

    const controller = new AbortController();
    fetch(
      `/api/community/posts?mine=true&type=REVIEW&resourceId=${encodeURIComponent(reviewLookupResourceId)}&pageSize=1`,
      { signal: controller.signal },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { data?: Array<{ id: string }> } | null) => {
        setExistingReview({
          resourceId: reviewLookupResourceId,
          postId: payload?.data?.[0]?.id ?? null,
        });
      })
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
          setExistingReview({ resourceId: reviewLookupResourceId, postId: null });
        }
      });
    return () => controller.abort();
  }, [reviewLookupResourceId]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const candidates = Array.from(files);
    if (images.length + candidates.length > 6) {
      setError("最多上传 6 张图片");
      return;
    }
    const invalid = candidates.find(
      (file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024,
    );
    if (invalid) {
      setError("图片仅支持 JPG、PNG、WebP，且每张不超过 5MB");
      return;
    }
    setError("");
    setImages((current) => [
      ...current,
      ...candidates.map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        kind: "new" as const,
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  }

  function removeImage(index: number) {
    setImages((current) => {
      const target = current[index];
      if (target?.kind === "new") URL.revokeObjectURL(target.url);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function moveImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    setImages((current) => {
      const copy = [...current];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const formData = new FormData();
    formData.set("type", type);
    formData.set("resourceId", resourceId);
    formData.set("title", title);
    formData.set("content", content);
    formData.set("rating", type === "REVIEW" ? String(rating) : rating ? String(rating) : "");
    formData.set("visitedAt", visitedAt);

    const newItems = images.filter((item): item is Extract<ImageItem, { kind: "new" }> => item.kind === "new");
    const imageOrder = images.map((item) => {
      if (item.kind === "existing") {
        formData.append("existingImages", item.url);
        return { kind: "existing", value: item.url };
      }
      return { kind: "new", index: newItems.findIndex((candidate) => candidate.id === item.id) };
    });
    newItems.forEach((item) => formData.append("images", item.file));
    formData.set("imageOrder", JSON.stringify(imageOrder));

    const endpoint = initialPost ? `/api/community/posts/${initialPost.id}` : "/api/community/posts";
    const response = await fetch(endpoint, {
      method: initialPost ? "PATCH" : "POST",
      body: formData,
    });
    const payload = (await response.json()) as {
      error?: string;
      existingId?: string;
      data?: { id: string };
    };
    setBusy(false);

    if (response.ok && payload.data) {
      router.push(`/community/${payload.data.id}`);
      router.refresh();
      return;
    }
    if (response.status === 409 && payload.existingId) {
      setError(`${payload.error ?? "已有内容"}，正在打开原内容……`);
      router.push(`/community/${payload.existingId}/edit`);
      return;
    }
    setError(payload.error ?? "提交失败，请稍后重试");
  }

  return (
    <form className="community-post-form" onSubmit={submit}>
      <div className="community-form-type" role="group" aria-label="发布类型">
        <button type="button" className={type === "CHECKIN" ? "active" : ""} onClick={() => setType("CHECKIN")}>
          <MapPin size={18} />我要打卡<small>记录到访时刻</small>
        </button>
        <button type="button" className={type === "REVIEW" ? "active review" : ""} onClick={() => setType("REVIEW")}>
          <Star size={18} />写评价<small>分享真实体验</small>
        </button>
      </div>

      <label className="community-form-field">
        <span>关联文旅资源<b>*</b></span>
        <select value={resourceId} onChange={(event) => setResourceId(event.target.value)} required>
          <option value="">请选择景点、非遗或美食</option>
          {groupedResources.map((group) => (
            <optgroup key={group.type} label={resourceTypeLabel(group.type)}>
              {group.items.map((resource) => <option key={resource.slug} value={resource.slug}>{resource.title}</option>)}
            </optgroup>
          ))}
        </select>
      </label>

      {type === "REVIEW" && (
        <fieldset className="community-star-field">
          <legend>总体评分<b>*</b></legend>
          <div>
            {Array.from({ length: 5 }, (_, index) => index + 1).map((value) => (
              <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} 星`}>
                <Star size={27} fill={value <= rating ? "currentColor" : "none"} />
              </button>
            ))}
            <strong>{rating ? `${rating}.0` : "请选择星级"}</strong>
          </div>
        </fieldset>
      )}

      {existingReviewId && (
        <div className="community-duplicate-review">
          <span>你已经评价过这个资源。为避免重复刷屏，请直接修改原评价；如果想再次记录到访，请切换到“我要打卡”。</span>
          <button type="button" onClick={() => router.push(`/community/${existingReviewId}/edit`)}>修改原评价</button>
        </div>
      )}

      <label className="community-form-field">
        <span>标题<b>*</b><small>{title.length}/80</small></span>
        <input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} placeholder="用一句话概括这段福州记忆" required />
      </label>

      <label className="community-form-field">
        <span>正文<b>*</b><small>{content.length}/3000</small></span>
        <textarea value={content} maxLength={3000} rows={9} onChange={(event) => setContent(event.target.value)} placeholder="写下真实体验、路线建议或让你印象深刻的细节……" required />
      </label>

      <label className="community-form-field community-date-field">
        <span>游览日期<small>打卡时建议填写</small></span>
        <input type="date" value={visitedAt} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setVisitedAt(event.target.value)} />
      </label>

      <div className="community-upload-field">
        <div className="community-upload-heading">
          <span>图文记录<small>最多6张，支持 JPG / PNG / WebP，单张不超过5MB</small></span>
          <label className={images.length >= 6 ? "disabled" : ""}>
            <ImagePlus size={17} />添加图片
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={images.length >= 6} onChange={(event) => addFiles(event.target.files)} />
          </label>
        </div>
        {images.length ? (
          <div className="community-image-sort">
            {images.map((image, index) => (
              <div key={image.id} className="community-image-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={`图片 ${index + 1}`} />
                <span>{index === 0 ? "封面" : index + 1}</span>
                <div>
                  <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0}><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1}><ArrowDown size={14} /></button>
                  <button type="button" onClick={() => removeImage(index)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="community-upload-empty"><ImagePlus size={26} /><span>添加照片，让打卡与评价更生动</span></div>
        )}
      </div>

      {error && <p className="community-form-error">{error}</p>}
      <div className="community-form-submit">
        <button type="button" onClick={() => router.back()}>取消</button>
        <button className="primary" type="submit" disabled={busy || Boolean(existingReviewId) || !resourceId || !title.trim() || !content.trim() || (type === "REVIEW" && !rating)}>
          {busy ? "正在保存……" : initialPost ? "保存修改" : "发布到文旅社区"}
        </button>
      </div>
    </form>
  );
}
