import { isGridsterVideoMediaUrl } from "../../lib/gridsterMediaUploads";

function PostMedia({ url, alt = "", video = false, controls = true }) {
  if (!url) {
    return null;
  }

  if (video || isGridsterVideoMediaUrl(url)) {
    return (
      <video
        src={url}
        controls={controls}
        playsInline
        preload="metadata"
        aria-label={alt || "Post video"}
      />
    );
  }

  return <img src={url} alt={alt} />;
}

export default PostMedia;
