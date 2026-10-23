/**
 * @module-note features/destination-resources/components/ResourceCard.tsx
 * 文旅资源展示与交互：资源卡片连接收藏、行程及详情入口。
 */
import Link from "next/link";
import type { DestinationResource } from "../types";

/**
 * 渲染features／destination-resources／components／ResourceCard.tsx界面及其子组件。
 */
export function ResourceCard({
  resource,
}: {
  resource: DestinationResource;
}) {
  return (
    <Link
      className="resource-card"
      href={`/resources/${resource.id}`}
    >
      <div
        className="resource-card-image"
        style={{
          backgroundImage: `url('${resource.image}')`,
        }}
      />

      <div className="resource-card-body">
        <div className="resource-card-top">
          <span className="resource-category">
            {resource.category}
          </span>
          <span className="resource-district">
            {resource.district}
          </span>
        </div>

        <h3>{resource.name}</h3>
        <p>{resource.summary}</p>

        <div className="resource-tags">
          {resource.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}
