import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { fetchGridsterProfile } from "../../lib/gridsterProfiles";
import { fetchFriends } from "../../lib/gridsterFriends";
import {
  GRIDSTER_GROUP_CATEGORY_LABELS,
  GRIDSTER_MATURITY_RATING_LABELS,
  createGroupPost,
  fetchGroup,
  fetchGroupMembers,
  fetchGroupMembership,
  fetchGroupPosts,
  inviteToGroup,
  joinGroup,
  leaveGroup,
} from "../../lib/gridsterGroups";
import { uploadGridsterGroupPhoto } from "../../lib/gridsterMediaUploads";
import TeleportStatusChip from "./TeleportStatusChip";

const EMPTY_POST_FORM = {
  post_type: "post",
  content: "",
  photo_url: "",
  when_label: "",
  region_name: "",
  slurl: "",
};

const TABS = ["Posts", "Events", "Announcements", "Photos", "Members"];

function GroupDetailPage({ groupId, onAuthOpen, onOpenResidentProfile, showToast }) {
  const [activeTab, setActiveTab] = useState("Posts");
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_POST_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [inviteCandidates, setInviteCandidates] = useState([]);
  const [invitedIds, setInvitedIds] = useState(new Set());
  const [inviteBusyId, setInviteBusyId] = useState("");

  const isOwner = user?.id === group?.owner_user_id;

  const refreshGroupData = async () => {
    const [nextGroup, nextPosts, nextMembers] = await Promise.all([
      fetchGroup(groupId),
      fetchGroupPosts(groupId),
      fetchGroupMembers(groupId),
    ]);

    setGroup(nextGroup);
    setPosts(nextPosts || []);
    setMembers(nextMembers || []);

    return nextGroup;
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
        await refreshGroupData();

        if (nextUser) {
          const [membership, profile] = await Promise.all([
            fetchGroupMembership(groupId, nextUser.id),
            fetchGridsterProfile(nextUser.id),
          ]);

          if (active) {
            setIsMember(membership);
            setDisplayName(profile?.display_name || profile?.sl_username || "");
          }
        } else if (active) {
          setIsMember(false);
        }
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
  }, [groupId]);

  const postsByType = useMemo(() => {
    return {
      post: posts.filter((post) => post.post_type === "post"),
      event: posts.filter((post) => post.post_type === "event"),
      announcement: posts.filter((post) => post.post_type === "announcement"),
      photo: posts.filter((post) => Boolean(post.photo_url)),
    };
  }, [posts]);

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
      } else {
        await joinGroup(groupId, user.id, displayName);
        showToast?.(`Joined ${group?.name}.`);
      }

      await refreshGroupData();
      setIsMember((current) => !current);
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

  const handleOpenForm = () => {
    if (!isMember) {
      showToast?.("Join this group to post.");
      return;
    }

    setShowForm(true);
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePhotoFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !user) {
      return;
    }

    setUploadingPhoto(true);
    setError("");

    try {
      const publicUrl = await uploadGridsterGroupPhoto(user.id, file);
      updateField("photo_url", publicUrl);
    } catch (uploadError) {
      setError(uploadError.message || "Could not upload that image.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmitPost = async (event) => {
    event.preventDefault();

    if (!user || !isMember) {
      return;
    }

    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      await createGroupPost(groupId, user.id, { ...form, author_name: displayName });
      await refreshGroupData();
      setForm(EMPTY_POST_FORM);
      setShowForm(false);
      setMessage("Posted.");
      showToast?.("Posted.");
    } catch (submitError) {
      setError(submitError.message || "Could not create this post.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="groups-directory-message">Loading group...</p>;
  }

  if (!group) {
    return <p className="groups-directory-message groups-directory-error">Group not found.</p>;
  }

  const activeList =
    activeTab === "Posts" ? postsByType.post
    : activeTab === "Events" ? postsByType.event
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
          </div>
          <h2>{group.name}</h2>
          {group.description ? <p>{group.description}</p> : null}
          <small>{group.member_count} members</small>

          <div className="group-detail-actions">
            <button type="button" disabled={membershipBusy} onClick={handleToggleMembership}>
              {isMember ? "Joined" : "Join"}
            </button>
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
      {message ? <p className="groups-directory-message groups-directory-success">{message}</p> : null}

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
        {activeTab !== "Members" ? (
          <button type="button" className="group-post-button" onClick={handleOpenForm}>
            + New Post
          </button>
        ) : null}
      </section>

      {showForm ? (
        <form className="place-post-form glass-card" onSubmit={handleSubmitPost}>
          <label>
            <span>Type</span>
            <select value={form.post_type} onChange={(event) => updateField("post_type", event.target.value)}>
              <option value="post">Post</option>
              <option value="event">Event</option>
              {isOwner ? <option value="announcement">Announcement</option> : null}
            </select>
          </label>

          <label>
            <span>Content</span>
            <textarea
              value={form.content}
              onChange={(event) => updateField("content", event.target.value)}
              required
            />
          </label>

          <div className="profile-field">
            <label>
              <span>Photo URL (optional)</span>
              <input
                type="text"
                value={form.photo_url}
                onChange={(event) => updateField("photo_url", event.target.value)}
                placeholder="https://..."
              />
            </label>
            <label className="profile-upload-button">
              {uploadingPhoto ? "Uploading..." : "Upload from Computer"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                disabled={uploadingPhoto}
                onChange={handlePhotoFileChange}
              />
            </label>
            <p className="profile-upload-hint">PNG, JPEG, WEBP, or GIF. Max 8MB.</p>
          </div>

          {form.post_type === "event" ? (
            <>
              <label>
                <span>When</span>
                <input
                  type="text"
                  value={form.when_label}
                  onChange={(event) => updateField("when_label", event.target.value)}
                  placeholder="Tonight 9PM SLT"
                />
              </label>

              <label>
                <span>Region Name</span>
                <input
                  type="text"
                  value={form.region_name}
                  onChange={(event) => updateField("region_name", event.target.value)}
                />
              </label>

              <label>
                <span>Teleport SLURL</span>
                <input
                  type="text"
                  value={form.slurl}
                  onChange={(event) => updateField("slurl", event.target.value)}
                  placeholder="secondlife://Region/128/128/25"
                />
              </label>
            </>
          ) : null}

          <div className="place-post-form-actions">
            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      ) : null}

      {activeTab === "Members" ? (
        <div className="group-member-list">
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
              <small>Joined {new Date(member.joined_at).toLocaleDateString()}</small>
            </div>
          ))}
        </div>
      ) : activeTab === "Photos" ? (
        <div className="group-photo-grid">
          {activeList.length === 0 ? <p className="groups-directory-message">No photos yet.</p> : null}
          {activeList.map((post) => (
            <div className="group-photo-tile" key={post.id}>
              <img src={post.photo_url} alt="" />
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
