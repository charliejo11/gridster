function EmojiPackPreviewModal({ pack, onClose }) {
  return (
    <div className="messenger-preview-overlay" onClick={onClose}>
      <div
        className="messenger-preview-modal glass-card"
        role="dialog"
        aria-modal="true"
        aria-label={`${pack.name} emoji pack preview`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="messenger-preview-heading">
          <span>Emoji Pack Preview</span>
          <h3>{pack.name}</h3>
          <p>{pack.description}</p>
        </div>

        <div className="emoji-pack-preview-grid">
          {(pack.emojis || []).map((emoji, index) => (
            <span className="emoji-pack-preview-tile" key={index}>{emoji}</span>
          ))}
        </div>

        <div className="messenger-preview-actions">
          <button type="button" onClick={onClose}>Close Preview</button>
        </div>
      </div>
    </div>
  );
}

export default EmojiPackPreviewModal;
