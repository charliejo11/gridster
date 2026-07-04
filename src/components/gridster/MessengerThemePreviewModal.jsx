function MessengerThemePreviewModal({ theme, onClose }) {
  return (
    <div className="messenger-preview-overlay" onClick={onClose}>
      <div
        className="messenger-preview-modal glass-card"
        role="dialog"
        aria-modal="true"
        aria-label={`${theme.name} messenger preview`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="messenger-preview-heading">
          <span>Messenger Theme Preview</span>
          <h3>{theme.name}</h3>
          <p>{theme.description}</p>
        </div>

        <div className={`messenger-preview-window ${theme.previewClass || ""}`}>
          <div className="messenger-preview-window-header">
            <span className="messenger-preview-dot" />
            <span className="messenger-preview-dot" />
            <span className="messenger-preview-dot" />
            <strong>RavenHex</strong>
          </div>

          <div className="messenger-preview-window-body">
            <article className="messenger-preview-bubble received">
              <p>That photo spot is insane.</p>
            </article>
            <article className="messenger-preview-bubble sent">
              <p>Right? Perfect lighting for this.</p>
            </article>
            <article className="messenger-preview-bubble received">
              <p>Send me the SLURL!</p>
            </article>
          </div>
        </div>

        <div className="messenger-preview-actions">
          <button type="button" onClick={onClose}>Close Preview</button>
        </div>
      </div>
    </div>
  );
}

export default MessengerThemePreviewModal;
