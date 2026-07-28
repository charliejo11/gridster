import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { fetchGridsterProfile, fetchProfilesByUserIds } from "../../lib/gridsterProfiles";
import { fetchFriends } from "../../lib/gridsterFriends";
import {
  GRIDSTER_GROUP_CATEGORY_LABELS,
  GRIDSTER_MATURITY_RATING_LABELS,
  fetchGroup,
  fetchGroupMembers,
  fetchGroupMembershipDetails,
  fetchMyGroupJoinRequestStatus,
  fetchPendingGroupJoinRequests,
  inviteToGroup,
  joinGroup,
  leaveGroup,
  moderatorUpdateGroupMemberStatus,
  requestToJoinGroup,
  respondToGroupJoinRequest,
  setGroupMemberRole,
} from "../../lib/gridsterGroups";
import {
  createGroupFeedPost,
  deleteGroupComment,
  deleteGroupFeedPost,
  fetchGroupFeedPosts,
  fetchGroupPostById,
  fetchGroupPostComments,
  fetchGroupPostEngagement,
  fetchGroupCommentLikeCounts,
  fetchMyGroupCommentLikes,
  fetchMyGroupPostLikes,
  hideGroupPostForUser,
  likeGroupComment,
  likeGroupPost,
  moderatorRemoveGroupComment,
  moderatorRemoveGroupPost,
  pinGroupPost,
  postGroupComment,
  reportGroupPost,
  setGroupPostCommentsEnabled,
  unlikeGroupComment,
  unlikeGroupPost,
  updateGroupComment,
  updateGroupFeedPost,
} from "../../lib/gridsterGroupPosts";
import { uploadGridsterGroupPhoto } from "../../lib/gridsterMediaUploads";
import { formatNotificationTime } from "../../lib/gridsterNotifications";
import TeleportStatusChip from "./TeleportStatusChip";

const TABS = ["Feed", "Events", "Announcements", "Photos", "Members"];

function getInitials(source) {
  const trimmed = String(source || "Resident").trim();
  const words = trimmed.replace(/[^a-z0-9\s]/gi, " ").trim().split(/\s+/);
  const initials = words.length > 1 ? `${words[0][0]}${words[1][0]}` : trimmed.slice(0, 2);
  return initials.toUpperCase();
}

function isModOrOwner(role) {
  return role === "owner" || role === "moderator";
}

// ---------------------------------------------------------------------------
// Rich composer: text, multi-photo, link, SLURL, mentions/hashtags/emoji as
// plain text (parsed server-side, same as the main feed composer).
// ---------------------------------------------------------------------------

function GroupFeedComposer({ groupId, user, displayName, canPostAnnouncement, showToast, onPosted }) {
  const [content, setContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [slurl, setSlurl] = useState("");
  const [postType, setPostType] = useState("post");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLinkField, setShowLinkField] = useState(false);
  const [showSlurlField, setShowSlurlField] = useState(false);

  const handleFilesSelected = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) {
      return;
    }

    setUploading(true);

    try {
      const uploaded = [];

      for (const file of files) {
        const url = await uploadGridsterGroupPhoto(user.id, file);
        uploaded.push(url);
      }

      setMediaUrls((current) => [...current, ...uploaded]);
    } catch (uploadError) {
      showToast?.(uploadError.message || "Could not upload one of those images.");
    } finally {
      setUploading(false);
    }
  };

  const removeMediaAt = (index) => {
    setMediaUrls((current) => current.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!content.trim() && !mediaUrls.length) {
      showToast?.("Write something or add a photo first.");
      return;
    }

    setSubmitting(true);

    try {
      await createGroupFeedPost(user.id, groupId, {
        content,
        media_urls: mediaUrls,
        link_url: linkUrl.trim(),
        slurl: slurl.trim(),
        post_type: postType,
        author_name: displayName,
      });

      setContent("");
      setMediaUrls([]);
      setLinkUrl("");
      setSlurl("");
      setShowLinkField(false);
      setShowSlurlField(false);
      setPostType("post");
      onPosted?.();
    } catch (submitError) {
      showToast?.(submitError.message || "Could not create that post.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  return (
    <form className="group-feed-composer glass-card" onSubmit={handleSubmit}>
      <textarea
        className="group-feed-composer-input"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Share something with the group... @mention, #hashtag, emoji all welcome"
        rows={3}
      />

      {mediaUrls.length ? (
        <div className="group-feed-composer-media-grid">
          {mediaUrls.map((url, index) => (
            <div className="group-feed-composer-media-item" key={url}>
              <img src={url} alt="" />
              <button type="button" onClick={() => removeMediaAt(index)} aria-label="Remove photo">×</button>
            </div>
          ))}
        </div>
      ) : null}

      {showLinkField ? (
        <input
          type="text"
          className="group-feed-composer-field"
          value={linkUrl}
          onChange={(event) => setLinkUrl(event.target.value)}
          placeholder="https://..."
        />
      ) : null}

      {showSlurlField ? (
        <input
          type="text"
          className="group-feed-composer-field"
          value={slurl}
          onChange={(event) => setSlurl(event.target.value)}
          placeholder="secondlife://Region/128/128/25"
        />
      ) : null}

      <div className="group-feed-composer-actions">
        <label className="group-feed-composer-tool-button">
          {uploading ? "Uploading..." : "📷 Photos"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            hidden
            disabled={uploading}
            onChange={handleFilesSelected}
          />
        </label>
        <button type="button" className="group-feed-composer-tool-button" onClick={() => setShowLinkField((v) => !v)}>
          🔗 Link
        </button>
        <button type="button" className="group-feed-composer-tool-button" onClick={() => setShowSlurlField((v) => !v)}>
          📍 SLURL
        </button>
        {canPostAnnouncement ? (
          <select value={postType} onChange={(event) => setPostType(event.target.value)} className="group-feed-composer-type-select">
            <option value="post">Post</option>
            <option value="announcement">Announcement</option>
          </select>
        ) : null}
        <button type="submit" className="group-feed-composer-submit" disabled={submitting || uploading}>
          {submitting ? "Posting..." : "Post to Group"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Comment thread (one level of replies, matches the spec's "keep nesting simple")
// ---------------------------------------------------------------------------

function GroupCommentComposer({ placeholder, submitting, onSubmit }) {
  const [value, setValue] = useState("");

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (value.trim()) {
        onSubmit(value).then(() => setValue(""));
      }
    }
  };

  return (
    <div className="group-comment-composer">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={submitting}
      />
      <button
        type="button"
        disabled={submitting || !value.trim()}
        onClick={() => onSubmit(value).then(() => setValue(""))}
      >
        Send
      </button>
    </div>
  );
}

function GroupCommentRow({
  comment,
  isReply,
  authorProfile,
  currentUser,
  myRole,
  likeCount,
  isLiked,
  highlighted,
  showToast,
  onChanged,
  onReplyTo,
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.content);
  const [busy, setBusy] = useState(false);
  const isOwn = currentUser?.id === comment.author_user_id;
  const canDelete = isOwn || isModOrOwner(myRole);

  const handleToggleLike = async () => {
    if (!currentUser) {
      showToast?.("Log in to like comments.");
      return;
    }

    setBusy(true);

    try {
      if (isLiked) {
        await unlikeGroupComment(currentUser.id, comment.id);
      } else {
        await likeGroupComment(currentUser.id, comment.id);
      }
      onChanged?.();
    } catch (error) {
      showToast?.(error.message || "Could not update that like.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    setBusy(true);

    try {
      await updateGroupComment(comment.id, currentUser.id, editValue);
      setEditing(false);
      onChanged?.();
    } catch (error) {
      showToast?.(error.message || "Could not save that edit.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) {
      return;
    }

    setBusy(true);

    try {
      if (isOwn) {
        await deleteGroupComment(comment.id, currentUser.id);
      } else {
        await moderatorRemoveGroupComment(comment.id);
      }
      onChanged?.();
    } catch (error) {
      showToast?.(error.message || "Could not remove that comment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={highlighted ? "group-comment-row is-highlighted" : "group-comment-row"} data-comment-id={comment.id}>
      <div className="group-comment-avatar">
        {authorProfile?.avatar_url ? <img src={authorProfile.avatar_url} alt="" /> : getInitials(authorProfile?.display_name)}
      </div>
      <div className="group-comment-body">
        <div className="group-comment-bubble">
          <strong>{authorProfile?.display_name || authorProfile?.sl_username || "Resident"}</strong>
          {editing ? (
            <textarea value={editValue} onChange={(event) => setEditValue(event.target.value)} rows={2} />
          ) : (
            <p>{comment.content}</p>
          )}
        </div>
        <div className="group-comment-meta">
          <span>{formatNotificationTime(comment.created_at)}</span>
          {comment.content_edited_at ? <span className="group-post-edited-label">Edited</span> : null}
          <button type="button" onClick={handleToggleLike} disabled={busy} className={isLiked ? "is-active" : ""}>
            ♥ {likeCount > 0 ? likeCount : "Like"}
          </button>
          {!isReply ? (
            <button type="button" onClick={() => onReplyTo?.(comment)}>Reply</button>
          ) : null}
          {isOwn && !editing ? <button type="button" onClick={() => setEditing(true)}>Edit</button> : null}
          {editing ? (
            <>
              <button type="button" onClick={handleSaveEdit} disabled={busy}>Save</button>
              <button type="button" onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : null}
          {canDelete ? <button type="button" onClick={handleDelete} disabled={busy}>Delete</button> : null}
        </div>
      </div>
    </article>
  );
}

function GroupCommentThread({ postId, postAuthorId, groupId, currentUser, myRole, showToast, highlightCommentId }) {
  const [comments, setComments] = useState([]);
  const [profilesById, setProfilesById] = useState(new Map());
  const [likeCounts, setLikeCounts] = useState(new Map());
  const [myLikes, setMyLikes] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [replyTarget, setReplyTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    setLoading(true);

    try {
      const rows = await fetchGroupPostComments(postId);
      setComments(rows);

      const commentIds = rows.map((row) => row.id);
      const [profiles, counts, mine] = await Promise.all([
        fetchProfilesByUserIds(rows.map((row) => row.author_user_id)),
        fetchGroupCommentLikeCounts(commentIds),
        currentUser ? fetchMyGroupCommentLikes(currentUser.id, commentIds) : Promise.resolve(new Set()),
      ]);

      setProfilesById(profiles);
      setLikeCounts(counts);
      setMyLikes(mine);
    } catch (error) {
      showToast?.(error.message || "Could not load comments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const topLevel = useMemo(() => comments.filter((comment) => !comment.parent_comment_id), [comments]);
  const repliesByParent = useMemo(() => {
    const map = new Map();

    for (const comment of comments) {
      if (comment.parent_comment_id) {
        const list = map.get(comment.parent_comment_id) || [];
        list.push(comment);
        map.set(comment.parent_comment_id, list);
      }
    }

    return map;
  }, [comments]);

  const handleSubmitTopLevel = async (value) => {
    if (!currentUser) {
      showToast?.("Log in to comment.");
      return;
    }

    setSubmitting(true);

    try {
      await postGroupComment(currentUser.id, postId, value, { groupId, postAuthorId });
      await refresh();
    } catch (error) {
      showToast?.(error.message || "Could not post that comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (value) => {
    if (!currentUser || !replyTarget) {
      return;
    }

    setSubmitting(true);

    try {
      await postGroupComment(currentUser.id, postId, value, {
        groupId,
        postAuthorId,
        parentCommentId: replyTarget.id,
        parentAuthorId: replyTarget.author_user_id,
      });
      setReplyTarget(null);
      await refresh();
    } catch (error) {
      showToast?.(error.message || "Could not post that reply.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="groups-directory-message">Loading comments...</p>;
  }

  return (
    <div className="group-comment-thread">
      {topLevel.map((comment) => (
        <div key={comment.id} className="group-comment-group">
          <GroupCommentRow
            comment={comment}
            isReply={false}
            authorProfile={profilesById.get(comment.author_user_id)}
            currentUser={currentUser}
            myRole={myRole}
            likeCount={likeCounts.get(comment.id) || 0}
            isLiked={myLikes.has(comment.id)}
            postId={postId}
            postAuthorId={postAuthorId}
            groupId={groupId}
            highlighted={highlightCommentId === comment.id}
            showToast={showToast}
            onChanged={refresh}
            onReplyTo={setReplyTarget}
          />
          {(repliesByParent.get(comment.id) || []).map((reply) => (
            <div className="group-comment-reply-indent" key={reply.id}>
              <GroupCommentRow
                comment={reply}
                isReply
                authorProfile={profilesById.get(reply.author_user_id)}
                currentUser={currentUser}
                myRole={myRole}
                likeCount={likeCounts.get(reply.id) || 0}
                isLiked={myLikes.has(reply.id)}
                postId={postId}
                postAuthorId={postAuthorId}
                groupId={groupId}
                highlighted={highlightCommentId === reply.id}
                showToast={showToast}
                onChanged={refresh}
              />
            </div>
          ))}
          {replyTarget?.id === comment.id ? (
            <div className="group-comment-reply-indent">
              <GroupCommentComposer
                placeholder={`Reply to ${profilesById.get(comment.author_user_id)?.display_name || "this comment"}...`}
                submitting={submitting}
                onSubmit={handleSubmitReply}
              />
            </div>
          ) : null}
        </div>
      ))}

      {currentUser ? (
        <GroupCommentComposer placeholder="Write a comment…" submitting={submitting} onSubmit={handleSubmitTopLevel} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feed post card
// ---------------------------------------------------------------------------

function GroupFeedPostCard({
  post,
  group,
  authorProfile,
  currentUser,
  myRole,
  likeCount,
  commentCount,
  isLiked,
  highlighted,
  autoExpandComments,
  highlightCommentId,
  onOpenResidentProfile,
  showToast,
  onChanged,
}) {
  const [showComments, setShowComments] = useState(Boolean(autoExpandComments));
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [busy, setBusy] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (highlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlighted]);

  const isOwn = currentUser?.id === post.user_id;
  const isMod = isModOrOwner(myRole);

  const handleToggleLike = async () => {
    if (!currentUser) {
      showToast?.("Log in to like posts.");
      return;
    }

    try {
      if (isLiked) {
        await unlikeGroupPost(currentUser.id, post.id);
      } else {
        await likeGroupPost(currentUser.id, post.id, { groupId: group.id, postAuthorId: post.user_id });
      }
      onChanged?.();
    } catch (error) {
      showToast?.(error.message || "Could not update that like.");
    }
  };

  const handleSaveEdit = async () => {
    setBusy(true);

    try {
      await updateGroupFeedPost(post.id, currentUser.id, { content: editContent, media_urls: post.media_urls, link_url: post.link_url, slurl: post.slurl });
      setEditing(false);
      onChanged?.();
    } catch (error) {
      showToast?.(error.message || "Could not save that edit.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post? This cannot be undone.")) {
      return;
    }

    setBusy(true);

    try {
      await deleteGroupFeedPost(post.id, currentUser.id);
      onChanged?.();
    } catch (error) {
      showToast?.(error.message || "Could not delete that post.");
      setBusy(false);
    }
  };

  const handleModeratorRemove = async () => {
    if (!window.confirm("Remove this post for everyone? This cannot be undone.")) {
      return;
    }

    setBusy(true);

    try {
      await moderatorRemoveGroupPost(post.id);
      onChanged?.();
    } catch (error) {
      showToast?.(error.message || "Could not remove that post.");
      setBusy(false);
    }
  };

  const handleTogglePin = async () => {
    setShowMenu(false);

    try {
      await pinGroupPost(post.id, !post.is_pinned);
      onChanged?.();
    } catch (error) {
      showToast?.(error.message || "Could not update pin status.");
    }
  };

  const handleToggleComments = async () => {
    setShowMenu(false);

    try {
      await setGroupPostCommentsEnabled(post.id, !post.comments_enabled);
      onChanged?.();
    } catch (error) {
      showToast?.(error.message || "Could not update comment settings.");
    }
  };

  const handleReport = async () => {
    setShowMenu(false);

    if (!currentUser) {
      showToast?.("Log in to report posts.");
      return;
    }

    try {
      await reportGroupPost(currentUser.id, post.id);
      showToast?.("Report sent to the group moderators.");
    } catch (error) {
      showToast?.(error.message || "Could not send that report.");
    }
  };

  const handleHide = async () => {
    setShowMenu(false);

    if (!currentUser) {
      return;
    }

    try {
      await hideGroupPostForUser(currentUser.id, post.id);
      showToast?.("Post hidden.");
      onChanged?.();
    } catch (error) {
      showToast?.(error.message || "Could not hide that post.");
    }
  };

  const handleCopyLink = async () => {
    setShowMenu(false);

    const url = `${window.location.origin}/?group=${group.id}&post=${post.id}`;

    try {
      await navigator.clipboard.writeText(url);
      showToast?.("Link copied.");
    } catch {
      showToast?.(url);
    }
  };

  const isEdited = Boolean(post.content_edited_at);

  return (
    <article
      ref={cardRef}
      className={highlighted ? "group-feed-post-card glass-card is-highlighted" : "group-feed-post-card glass-card"}
    >
      {post.is_pinned ? <div className="group-feed-pinned-label">📌 Pinned by group admin</div> : null}
      {post.post_type === "announcement" ? <div className="group-feed-announcement-label">Announcement</div> : null}

      <div className="group-feed-post-header">
        <button
          type="button"
          className="group-feed-post-avatar"
          onClick={() => onOpenResidentProfile?.(post.user_id)}
        >
          {authorProfile?.avatar_url ? <img src={authorProfile.avatar_url} alt="" /> : getInitials(authorProfile?.display_name || post.author_name)}
        </button>
        <div className="group-feed-post-header-copy">
          <button type="button" className="group-feed-post-author-name" onClick={() => onOpenResidentProfile?.(post.user_id)}>
            {authorProfile?.display_name || post.author_name || "Resident"}
          </button>
          {authorProfile?.sl_verified ? <span className="resident-verified-badge" title="Verified Resident">✔</span> : null}
          <div className="group-feed-post-meta-row">
            <span>{formatNotificationTime(post.created_at)}</span>
            {isEdited ? <span className="group-post-edited-label">Edited</span> : null}
          </div>
        </div>

        <div className="group-feed-post-menu">
          <button type="button" className="group-feed-post-menu-button" onClick={() => setShowMenu((v) => !v)} aria-label="Post options">
            ⋯
          </button>
          {showMenu ? (
            <div className="group-feed-post-menu-dropdown glass-card">
              {isOwn ? (
                <>
                  <button type="button" onClick={() => { setEditing(true); setShowMenu(false); }}>Edit post</button>
                  <button type="button" onClick={() => { setShowMenu(false); handleDelete(); }}>Delete post</button>
                  <button type="button" onClick={handleToggleComments}>
                    {post.comments_enabled ? "Turn comments off" : "Turn comments on"}
                  </button>
                </>
              ) : null}
              {isMod ? (
                <>
                  <button type="button" onClick={handleTogglePin}>{post.is_pinned ? "Unpin post" : "Pin post"}</button>
                  <button type="button" onClick={() => { setShowMenu(false); handleModeratorRemove(); }}>Remove post</button>
                  {!isOwn ? (
                    <button type="button" onClick={handleToggleComments}>
                      {post.comments_enabled ? "Lock comments" : "Unlock comments"}
                    </button>
                  ) : null}
                </>
              ) : null}
              {!isOwn ? (
                <>
                  <button type="button" onClick={handleReport}>Report post</button>
                  <button type="button" onClick={handleCopyLink}>Copy link</button>
                  <button type="button" onClick={handleHide}>Hide post</button>
                </>
              ) : (
                <button type="button" onClick={handleCopyLink}>Copy link</button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="group-feed-post-edit-form">
          <textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} rows={3} />
          <div className="group-feed-post-edit-actions">
            <button type="button" onClick={handleSaveEdit} disabled={busy}>Save</button>
            <button type="button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        post.content ? <p className="group-feed-post-content">{post.content}</p> : null
      )}

      {post.media_urls?.length ? (
        <div className={post.media_urls.length > 1 ? "group-feed-post-media-grid" : "group-feed-post-media-single"}>
          {post.media_urls.map((url) => (
            <div className="group-feed-post-media-item" key={url}>
              <img src={url} alt="" />
            </div>
          ))}
        </div>
      ) : null}

      {post.link_url ? (
        <a className="group-feed-post-link" href={post.link_url} target="_blank" rel="noreferrer">
          🔗 {post.link_url}
        </a>
      ) : null}

      {post.slurl ? (
        <div className="group-post-actions">
          <button type="button" data-destination={post.content || group.name} data-slurl={post.slurl}>
            Teleport
          </button>
          <TeleportStatusChip slurl={post.slurl} destinationName={post.content || group.name} showToast={showToast} />
        </div>
      ) : null}

      <div className="group-feed-post-stats-row">
        <button type="button" className={isLiked ? "group-feed-stat-button is-active" : "group-feed-stat-button"} onClick={handleToggleLike}>
          ♥ {likeCount > 0 ? likeCount : "Like"}
        </button>
        <button type="button" className="group-feed-stat-button" onClick={() => setShowComments((v) => !v)}>
          💬 {commentCount > 0 ? commentCount : "Comment"}
        </button>
        <button type="button" className="group-feed-stat-button" onClick={handleCopyLink}>
          ↗ Share
        </button>
      </div>

      {showComments ? (
        post.comments_enabled ? (
          <GroupCommentThread
            postId={post.id}
            postAuthorId={post.user_id}
            groupId={group.id}
            currentUser={currentUser}
            myRole={myRole}
            showToast={showToast}
            highlightCommentId={highlightCommentId}
          />
        ) : (
          <p className="groups-directory-message">Comments are turned off for this post.</p>
        )
      ) : null}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function GroupDetailPage({ groupId, scrollTarget, onAuthOpen, onOpenResidentProfile, showToast }) {
  const [activeTab, setActiveTab] = useState("Feed");
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [group, setGroup] = useState(null);
  const [membership, setMembership] = useState(null);
  const [joinRequestStatus, setJoinRequestStatus] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [error, setError] = useState("");
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [inviteCandidates, setInviteCandidates] = useState([]);
  const [invitedIds, setInvitedIds] = useState(new Set());
  const [inviteBusyId, setInviteBusyId] = useState("");

  const [feedPosts, setFeedPosts] = useState([]);
  const [profilesById, setProfilesById] = useState(new Map());
  const [engagement, setEngagement] = useState(new Map());
  const [myLikedPostIds, setMyLikedPostIds] = useState(new Set());
  const [feedLoading, setFeedLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  const isMember = membership?.status === "active";
  const myRole = membership?.role || null;
  const isOwner = user?.id === group?.owner_user_id;

  const refreshGroupMeta = async () => {
    const [nextGroup, nextMembers] = await Promise.all([
      fetchGroup(groupId),
      fetchGroupMembers(groupId),
    ]);

    setGroup(nextGroup);
    setMembers((nextMembers || []).filter((member) => member.status !== "banned"));

    return nextGroup;
  };

  const refreshFeed = async (currentGroup, currentUser) => {
    setFeedLoading(true);

    try {
      const posts = await fetchGroupFeedPosts(groupId);
      setFeedPosts(posts);

      const postIds = posts.map((post) => post.id);

      const [profiles, stats, myLikes] = await Promise.all([
        fetchProfilesByUserIds(posts.map((post) => post.user_id)),
        fetchGroupPostEngagement(postIds),
        currentUser ? fetchMyGroupPostLikes(currentUser.id, postIds) : Promise.resolve(new Set()),
      ]);

      setProfilesById(profiles);
      setEngagement(stats);
      setMyLikedPostIds(myLikes);
    } catch (feedError) {
      // A private group a non-member can't see yet resolves to an empty
      // list via RLS, not an error - only surface genuine failures.
      if (feedError?.message) {
        console.error("Gridster group feed: could not load posts", feedError);
      }
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function load(nextUser) {
      if (!active) {
        return;
      }

      setUser(nextUser);
      setLoading(true);

      try {
        const nextGroup = await refreshGroupMeta();

        if (nextUser) {
          const [membershipDetails, profile] = await Promise.all([
            fetchGroupMembershipDetails(groupId, nextUser.id),
            fetchGridsterProfile(nextUser.id),
          ]);

          if (active) {
            setMembership(membershipDetails);
            setDisplayName(profile?.display_name || profile?.sl_username || "");

            if (!membershipDetails && nextGroup?.privacy === "private") {
              const request = await fetchMyGroupJoinRequestStatus(groupId, nextUser.id);
              if (active) setJoinRequestStatus(request);
            }

            if (membershipDetails && isModOrOwner(membershipDetails.role) && nextGroup?.privacy === "private") {
              const requests = await fetchPendingGroupJoinRequests(groupId);
              if (active) setPendingRequests(requests);
            }
          }
        } else if (active) {
          setMembership(null);
        }

        await refreshFeed(nextGroup, nextUser);
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Could not load this group.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    supabase.auth
      .getUser()
      .then(({ data }) => load(data?.user ?? null))
      .catch((authError) => {
        if (!active) {
          return;
        }

        setError(authError.message || "Could not check your login session.");
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user ?? null);
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    if (!feedLoading && refreshToken > 0) {
      refreshFeed(group, user);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  // Deep link support: if the scroll-target post isn't in the loaded
  // feed (e.g. an older post reached via a notification or copied
  // link), fetch just that one and prepend it so it's genuinely there
  // to scroll to, not just a silent miss.
  useEffect(() => {
    if (!scrollTarget?.postId || feedLoading) {
      return;
    }

    if (feedPosts.some((post) => post.id === scrollTarget.postId)) {
      return;
    }

    fetchGroupPostById(scrollTarget.postId).then((post) => {
      if (post) {
        setFeedPosts((current) => [post, ...current]);
        fetchProfilesByUserIds([post.user_id]).then((profiles) => {
          setProfilesById((current) => new Map([...current, ...profiles]));
        });
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTarget, feedLoading]);

  const postsByType = useMemo(() => {
    return {
      post: feedPosts.filter((post) => post.post_type === "post"),
      event: feedPosts.filter((post) => post.post_type === "event"),
      announcement: feedPosts.filter((post) => post.post_type === "announcement"),
      photo: feedPosts.filter((post) => post.media_urls?.length || post.photo_url),
    };
  }, [feedPosts]);

  const handleToggleMembership = async () => {
    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    setMembershipBusy(true);

    try {
      if (isMember) {
        await leaveGroup(groupId, user.id);
        showToast?.(`Left ${group?.name}.`);
        setMembership(null);
      } else if (group?.privacy === "private") {
        const request = await requestToJoinGroup(groupId, user.id);
        setJoinRequestStatus(request);
        showToast?.("Request sent. The group owner will review it.");
      } else {
        await joinGroup(groupId, user.id, displayName);
        showToast?.(`Joined ${group?.name}.`);
        const membershipDetails = await fetchGroupMembershipDetails(groupId, user.id);
        setMembership(membershipDetails);
      }

      await refreshGroupMeta();
    } catch (toggleError) {
      showToast?.(toggleError.message || "Could not update your membership.");
    } finally {
      setMembershipBusy(false);
    }
  };

  const handleOpenInvitePanel = async () => {
    if (!user) {
      onAuthOpen?.("login");
      return;
    }

    setShowInvitePanel((current) => !current);

    if (!inviteCandidates.length) {
      try {
        const friends = await fetchFriends(user.id);
        const memberIds = new Set(members.map((member) => member.user_id));
        setInviteCandidates(friends.filter((friend) => !memberIds.has(friend.user_id)));
      } catch (loadError) {
        showToast?.(loadError.message || "Could not load your friends list.");
      }
    }
  };

  const handleInviteFriend = async (friendUserId) => {
    setInviteBusyId(friendUserId);

    try {
      await inviteToGroup(groupId, user.id, friendUserId);
      setInvitedIds((current) => new Set(current).add(friendUserId));
      showToast?.("Invite sent.");
    } catch (inviteError) {
      showToast?.(inviteError.message || "Could not send that invite.");
    } finally {
      setInviteBusyId("");
    }
  };

  const handleRespondJoinRequest = async (requestId, approve) => {
    try {
      await respondToGroupJoinRequest(requestId, approve);
      setPendingRequests((current) => current.filter((request) => request.id !== requestId));
      await refreshGroupMeta();
      showToast?.(approve ? "Member approved." : "Request denied.");
    } catch (respondError) {
      showToast?.(respondError.message || "Could not update that request.");
    }
  };

  const handleSetRole = async (targetUserId, newRole) => {
    try {
      await setGroupMemberRole(groupId, targetUserId, newRole);
      await refreshGroupMeta();
      showToast?.("Member role updated.");
    } catch (roleError) {
      showToast?.(roleError.message || "Could not update that member's role.");
    }
  };

  const handleUpdateMemberStatus = async (targetUserId, newStatus) => {
    const confirmMessage =
      newStatus === "removed" ? "Remove this member from the group?"
      : newStatus === "banned" ? "Ban this member? They will lose access immediately."
      : newStatus === "suspended" ? "Suspend this member?"
      : "Reactivate this member?";

    if (newStatus !== "active" && !window.confirm(confirmMessage)) {
      return;
    }

    try {
      await moderatorUpdateGroupMemberStatus(groupId, targetUserId, newStatus);
      await refreshGroupMeta();
      showToast?.("Member updated.");
    } catch (statusError) {
      showToast?.(statusError.message || "Could not update that member.");
    }
  };

  if (loading) {
    return <p className="groups-directory-message">Loading group...</p>;
  }

  if (!group) {
    return <p className="groups-directory-message groups-directory-error">Group not found.</p>;
  }

  const activeList =
    activeTab === "Events" ? postsByType.event
    : activeTab === "Announcements" ? postsByType.announcement
    : activeTab === "Photos" ? postsByType.photo
    : [];

  return (
    <section className="group-detail-page">
      <article className="group-detail-hero glass-card">
        <div className="group-detail-photo">
          {group.photo_url ? <img src={group.photo_url} alt="" /> : <span>{group.name.charAt(0)}</span>}
        </div>

        <div className="group-detail-hero-copy">
          <div className="group-directory-meta">
            <span className="group-category-pill">{GRIDSTER_GROUP_CATEGORY_LABELS[group.category]}</span>
            <span className="group-maturity-badge">{GRIDSTER_MATURITY_RATING_LABELS[group.maturity_rating]}</span>
            <span className="group-privacy-pill">{group.privacy === "private" ? "🔒 Private" : "Public"}</span>
          </div>
          <h2>{group.name}</h2>
          {group.description ? <p>{group.description}</p> : null}
          <small>{group.member_count} members</small>

          <div className="group-detail-actions">
            {joinRequestStatus?.status === "pending" ? (
              <button type="button" disabled>Request Pending</button>
            ) : (
              <button type="button" disabled={membershipBusy} onClick={handleToggleMembership}>
                {isMember
                  ? myRole === "owner" ? "Owner" : "Joined"
                  : group.privacy === "private" ? "Request to Join" : "Join"}
              </button>
            )}
            {isMember ? (
              <button type="button" onClick={handleOpenInvitePanel}>
                Invite
              </button>
            ) : null}
            {group.slurl ? (
              <button type="button" data-destination={group.name} data-slurl={group.slurl}>
                Teleport
              </button>
            ) : null}
            <TeleportStatusChip slurl={group.slurl} destinationName={group.name} showToast={showToast} />
          </div>
        </div>
      </article>

      {showInvitePanel ? (
        <section className="group-invite-panel glass-card">
          <h3>Invite a friend</h3>
          {inviteCandidates.length === 0 ? (
            <p className="groups-directory-message">All your friends are already in this group, or you have no friends yet.</p>
          ) : (
            <div className="group-member-list">
              {inviteCandidates.map((friend) => (
                <div className="group-member-row" key={friend.user_id}>
                  <button
                    type="button"
                    className="group-member-name-button"
                    onClick={() => onOpenResidentProfile?.(friend.user_id)}
                  >
                    {friend.display_name || friend.sl_username || "Resident"}
                  </button>
                  <button
                    type="button"
                    disabled={inviteBusyId === friend.user_id || invitedIds.has(friend.user_id)}
                    onClick={() => handleInviteFriend(friend.user_id)}
                  >
                    {invitedIds.has(friend.user_id) ? "Invited" : inviteBusyId === friend.user_id ? "..." : "Invite"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {error ? <p className="groups-directory-message groups-directory-error" role="alert">{error}</p> : null}

      <section className="groups-category-tabs group-detail-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </section>

      {activeTab === "Feed" ? (
        <div className="group-feed">
          {isMember ? (
            <GroupFeedComposer
              groupId={groupId}
              user={user}
              displayName={displayName}
              canPostAnnouncement={isModOrOwner(myRole)}
              showToast={showToast}
              onPosted={() => setRefreshToken((t) => t + 1)}
            />
          ) : (
            <p className="groups-directory-message">
              {user
                ? group.privacy === "private"
                  ? "Request to join this group to see and share posts."
                  : "Join this group to post and comment."
                : "Log in and join this group to post and comment."}
            </p>
          )}

          {feedLoading ? <p className="groups-directory-message">Loading posts...</p> : null}

          {!feedLoading && !feedPosts.length ? (
            <p className="groups-directory-message">No posts yet. Be the first to start the chatter.</p>
          ) : null}

          <div className="group-feed-list">
            {feedPosts.map((post) => (
              <GroupFeedPostCard
                key={post.id}
                post={post}
                group={group}
                authorProfile={profilesById.get(post.user_id)}
                currentUser={user}
                myRole={myRole}
                likeCount={engagement.get(post.id)?.likeCount || 0}
                commentCount={engagement.get(post.id)?.commentCount || 0}
                isLiked={myLikedPostIds.has(post.id)}
                highlighted={scrollTarget?.postId === post.id}
                autoExpandComments={scrollTarget?.postId === post.id}
                highlightCommentId={scrollTarget?.postId === post.id ? scrollTarget?.commentId : null}
                onOpenResidentProfile={onOpenResidentProfile}
                showToast={showToast}
                onChanged={() => setRefreshToken((t) => t + 1)}
              />
            ))}
          </div>
        </div>
      ) : activeTab === "Members" ? (
        <div className="group-member-list">
          {pendingRequests.length ? (
            <section className="group-join-requests-panel glass-card">
              <h3>Pending Requests</h3>
              {pendingRequests.map((request) => (
                <div className="group-member-row" key={request.id}>
                  <button type="button" className="group-member-name-button" onClick={() => onOpenResidentProfile?.(request.user_id)}>
                    Resident request
                  </button>
                  <div className="group-directory-actions">
                    <button type="button" onClick={() => handleRespondJoinRequest(request.id, true)}>Approve</button>
                    <button type="button" onClick={() => handleRespondJoinRequest(request.id, false)}>Deny</button>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {members.length === 0 ? <p className="groups-directory-message">No members yet.</p> : null}
          {members.map((member) => (
            <div className="group-member-row" key={member.id}>
              <button
                type="button"
                className="group-member-name-button"
                onClick={() => onOpenResidentProfile?.(member.user_id)}
              >
                {member.display_name || "Resident"}
              </button>
              <span className={`group-role-pill group-role-${member.role}`}>{member.role}</span>
              {member.status !== "active" ? <span className="group-status-pill">{member.status}</span> : null}
              <small>Joined {new Date(member.joined_at).toLocaleDateString()}</small>

              {isOwner && member.role !== "owner" ? (
                <button
                  type="button"
                  onClick={() => handleSetRole(member.user_id, member.role === "moderator" ? "member" : "moderator")}
                >
                  {member.role === "moderator" ? "Remove Moderator" : "Make Moderator"}
                </button>
              ) : null}

              {isModOrOwner(myRole) && member.role !== "owner" ? (
                <div className="group-directory-actions">
                  {member.status === "active" ? (
                    <button type="button" onClick={() => handleUpdateMemberStatus(member.user_id, "suspended")}>Suspend</button>
                  ) : (
                    <button type="button" onClick={() => handleUpdateMemberStatus(member.user_id, "active")}>Reactivate</button>
                  )}
                  <button type="button" onClick={() => handleUpdateMemberStatus(member.user_id, "banned")}>Ban</button>
                  <button type="button" onClick={() => handleUpdateMemberStatus(member.user_id, "removed")}>Remove</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : activeTab === "Photos" ? (
        <div className="group-photo-grid">
          {activeList.length === 0 ? <p className="groups-directory-message">No photos yet.</p> : null}
          {activeList.map((post) => (
            <div className="group-photo-tile" key={post.id}>
              <img src={post.media_urls?.[0] || post.photo_url} alt="" />
            </div>
          ))}
        </div>
      ) : (
        <div className="group-post-list">
          {activeList.length === 0 ? <p className="groups-directory-message">Nothing here yet.</p> : null}
          {activeList.map((post) => (
            <article className="group-post-card glass-card" key={post.id}>
              {post.photo_url ? (
                <div className="group-post-photo"><img src={post.photo_url} alt="" /></div>
              ) : null}
              <div className="group-post-body">
                <div className="group-post-meta">
                  <strong>{post.author_name || "Resident"}</strong>
                  {post.when_label ? <span className="group-post-when">{post.when_label}</span> : null}
                </div>
                {post.content ? <p>{post.content}</p> : null}
                {post.slurl ? (
                  <div className="group-post-actions">
                    <button type="button" data-destination={post.content || group.name} data-slurl={post.slurl}>
                      Teleport
                    </button>
                    <TeleportStatusChip slurl={post.slurl} destinationName={post.content || group.name} showToast={showToast} />
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default GroupDetailPage;
