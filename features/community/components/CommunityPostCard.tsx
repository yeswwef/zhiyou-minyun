import Link from "next/link";
import { Heart, MapPin, MessageCircle, Star } from "lucide-react";
import type { CommunityPostDto } from "../types";
import { formatCommunityDate, postTypeLabel } from "../types";

export function CommunityPostCard({ post }: { post: CommunityPostDto }) {
  const cover = post.images[0]?.imageUrl || post.resource.image || "/images/sanfangqixiang.jpg";
  const author = post.author.nickname || post.author.username;

  return (
    <Link href={`/community/${post.id}`} className="community-post-card">
      <div className="community-card-cover" style={{ backgroundImage: `url('${cover}')` }}>
        <span className={`community-type-badge ${post.type.toLowerCase()}`}>
          {post.type === "CHECKIN" ? <MapPin size={15} /> : <Star size={15} fill="currentColor" />}
          {postTypeLabel(post.type)}
        </span>
        <span className="community-resource-badge">{post.resource.title}</span>
      </div>
      <div className="community-card-body">
        <h2>{post.title}</h2>
        {post.rating && (
          <div className="community-rating" aria-label={`${post.rating} 星`}>
            {Array.from({ length: 5 }, (_, index) => (
              <Star key={index} size={16} fill={index < post.rating! ? "currentColor" : "none"} />
            ))}
            <b>{post.rating}.0</b>
          </div>
        )}
        <p>{post.content}</p>
        <div className="community-card-footer">
          <span className="community-avatar">{author.slice(0, 1)}</span>
          <strong>{author}</strong>
          <small>{formatCommunityDate(post.createdAt)}</small>
          <span className="community-card-count" aria-label={`${post.counts.comments} 条评论`}><MessageCircle size={16} />{post.counts.comments}</span>
          <span className="community-heart" aria-label={`${post.counts.likes} 个赞`}><Heart size={18} />{post.counts.likes}</span>
        </div>
      </div>
    </Link>
  );
}
