import { useQuery } from "@tanstack/react-query";
import { getSession } from "@/core/auth";
import { formatDateTime } from "@/core/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { loadSocialPost, type PostComment } from "../../api/extras";
import { useMaskedValue } from "../../hooks/useMaskedValue";
import { RichText } from "./RichText";
import { Media } from "./Media";
function Comment({ comment, context, depth = 0 }: { comment: PostComment; context: string; depth?: number }) {
  const name = useMaskedValue(comment.username, "firstName", context);
  const mime = comment.attachment?.mimeType?.toLowerCase() ?? "";
  return (
    <li className="space-y-2 rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap gap-2 text-xs">
        <strong>{name || "Comment"}</strong>
        {comment.timestamp && (
          <time className="text-muted-foreground">{formatDateTime(comment.timestamp)}</time>
        )}
        {comment.additionalData?.appRating != null && (
          <span aria-label={`Rating ${comment.additionalData.appRating} out of 5`}>
            ★ {comment.additionalData.appRating}/5
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap">
        <RichText text={comment.text ?? ""} formatting />
      </p>
      {comment.attachment?.mediaUrl && (
        <Media url={comment.attachment.mediaUrl} kind={mime.includes("video") ? "video" : "image"} />
      )}
      {depth < 10 && comment.subComments?.length ? (
        <ul className="ms-4 grid gap-2 border-s ps-3">
          {comment.subComments.map((child, index) => (
            <Comment key={child.id ?? index} comment={child} context={context} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
export function SocialPostDialog({
  postId,
  serviceIdentifier,
  context,
  onClose,
}: {
  postId: string;
  serviceIdentifier: string;
  context: string;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ["social-post", getSession().user?.id, serviceIdentifier, postId],
    queryFn: ({ signal }) => loadSocialPost(postId, serviceIdentifier, signal),
  });
  const post = query.data?.socialMediaPost;
  const name = useMaskedValue(post?.username, "firstName", context);
  const permalink =
    post?.permalinkUrl && /^https?:\/\//i.test(post.permalinkUrl) ? post.permalinkUrl : undefined;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-2xl">
        <DialogTitle>Full social post</DialogTitle>
        <DialogDescription>Post content and comments from this channel.</DialogDescription>
        {query.isPending && <p role="status">Loading post…</p>}
        {query.isError && (
          <p role="alert" className="text-destructive-text">
            {query.error.message}
            <Button variant="ghost" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </p>
        )}
        {post && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{name}</strong>
              {post.timestamp && (
                <time className="text-xs text-muted-foreground">{formatDateTime(post.timestamp)}</time>
              )}
              {permalink && (
                <a
                  href={permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline"
                >
                  Open original post
                </a>
              )}
            </div>
            <p className="whitespace-pre-wrap">
              <RichText text={post.text ?? ""} formatting />
            </p>
            {post.attachments?.map((file, index) => (
              <Media
                key={index}
                url={file.mediaUrl}
                kind={file.mimeType?.toLowerCase().includes("video") ? "video" : "image"}
              />
            ))}
            <p className="text-xs font-semibold text-muted-foreground">Comments</p>
            <ul className="grid gap-3">
              {post.comments?.map((comment, index) => (
                <Comment key={comment.id ?? index} comment={comment} context={context} />
              ))}
            </ul>
          </div>
        )}
        {query.isSuccess && !post && (
          <p className="text-sm text-muted-foreground">This post is unavailable.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
