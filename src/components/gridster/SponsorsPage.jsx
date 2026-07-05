import { useRef, useState } from "react";

const SPONSOR_TYPES = ["Store", "Club / Venue", "Sim", "Event", "Brand / Creator", "Other"];

const SPONSOR_PACKAGES = [
  {
    name: "Spark Sponsor",
    icon: "✦",
    description: "A starter spotlight for new stores, clubs, and creators getting on the grid.",
    price: "$5/mo (placeholder)",
    features: [
      "Listed in the Sponsor directory",
      "Small logo placement",
      "1 social shoutout post",
    ],
  },
  {
    name: "Glow Up Sponsor",
    icon: "✧",
    description: "Boosted visibility for growing brands ready to reach more residents.",
    price: "$15/mo (placeholder)",
    features: [
      "Everything in Spark Sponsor",
      "Homepage banner rotation",
      "Priority directory placement",
      "2 social shoutout posts",
    ],
  },
  {
    name: "VIP Spotlight",
    icon: "◆",
    description: "Top-tier placement for brands that want maximum exposure across Gridster.",
    price: "$30/mo (placeholder)",
    features: [
      "Everything in Glow Up Sponsor",
      "Featured hero placement on Home",
      "Dedicated Spotlight Awards feature",
      "Weekly social shoutouts",
    ],
  },
  {
    name: "Event Blast",
    icon: "◇",
    description: "One-time push to fill the room for a single event or grand opening.",
    price: "$10/event (placeholder)",
    features: [
      "Featured on Tonight in SL & Events",
      "Push in resident notifications",
      "Pinned for 48 hours",
    ],
  },
  {
    name: "Store Drop",
    icon: "♢",
    description: "Announce a new release or store drop to shoppers across the grid.",
    price: "$8/drop (placeholder)",
    features: [
      "Featured in Marketplace Finds",
      "Store Drop badge on your post",
      "Pinned for 24 hours",
    ],
  },
];

const EMPTY_SPONSOR_FORM = {
  business_name: "",
  owner_name: "",
  sl_username: "",
  sponsor_type: "",
  package_wanted: "",
  logo_url: "",
  slurl: "",
  marketplace_link: "",
  social_links: "",
  description: "",
  contact_method: "",
};

function SponsorsPage({ showToast }) {
  const [form, setForm] = useState(EMPTY_SPONSOR_FORM);
  const formRef = useRef(null);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSelectPackage = (packageName) => {
    setForm((current) => ({ ...current, package_wanted: packageName }));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    showToast?.("Sponsor request received.");
    setForm(EMPTY_SPONSOR_FORM);
  };

  return (
    <section className="sponsors-page">
      <section className="boost-packages-card glass-card">
        <div className="boost-packages-heading">
          <span>Sponsor Packages</span>
          <h3>Pick the placement that fits your brand</h3>
        </div>

        <div className="boost-package-grid">
          {SPONSOR_PACKAGES.map((pkg) => (
            <article className="boost-package-tile" key={pkg.name}>
              <div className="boost-package-icon">{pkg.icon}</div>
              <h4>{pkg.name}</h4>
              <p>{pkg.description}</p>
              <span className="boost-cost-pill">{pkg.price}</span>
              <ul className="sponsor-package-features">
                {pkg.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button type="button" onClick={() => handleSelectPackage(pkg.name)}>
                Select Package
              </button>
            </article>
          ))}
        </div>
      </section>

      <form className="sponsor-form place-post-form glass-card" ref={formRef} onSubmit={handleSubmit}>
        <h3 style={{ gridColumn: "1 / -1" }}>Sponsor Application</h3>

        <label>
          <span>Business / Club / Sim Name</span>
          <input
            type="text"
            value={form.business_name}
            onChange={(event) => updateField("business_name", event.target.value)}
            required
          />
        </label>

        <label>
          <span>Owner Name</span>
          <input
            type="text"
            value={form.owner_name}
            onChange={(event) => updateField("owner_name", event.target.value)}
            required
          />
        </label>

        <label>
          <span>Second Life Username</span>
          <input
            type="text"
            value={form.sl_username}
            onChange={(event) => updateField("sl_username", event.target.value)}
            required
          />
        </label>

        <label>
          <span>Sponsor Type</span>
          <select
            value={form.sponsor_type}
            onChange={(event) => updateField("sponsor_type", event.target.value)}
            required
          >
            <option value="">Select a type</option>
            {SPONSOR_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Package Wanted</span>
          <select
            value={form.package_wanted}
            onChange={(event) => updateField("package_wanted", event.target.value)}
            required
          >
            <option value="">Select a package</option>
            {SPONSOR_PACKAGES.map((pkg) => (
              <option key={pkg.name} value={pkg.name}>{pkg.name}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Logo / Image URL</span>
          <input
            type="text"
            value={form.logo_url}
            onChange={(event) => updateField("logo_url", event.target.value)}
            placeholder="https://..."
          />
        </label>

        <label>
          <span>SLURL</span>
          <input
            type="text"
            value={form.slurl}
            onChange={(event) => updateField("slurl", event.target.value)}
            placeholder="secondlife://Region/128/128/25"
          />
        </label>

        <label>
          <span>Marketplace Link</span>
          <input
            type="text"
            value={form.marketplace_link}
            onChange={(event) => updateField("marketplace_link", event.target.value)}
            placeholder="https://marketplace.secondlife.com/..."
          />
        </label>

        <label>
          <span>Social Links</span>
          <input
            type="text"
            value={form.social_links}
            onChange={(event) => updateField("social_links", event.target.value)}
            placeholder="Flickr, Instagram, Discord..."
          />
        </label>

        <label>
          <span>Description</span>
          <textarea
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </label>

        <label>
          <span>Preferred Contact Method</span>
          <input
            type="text"
            value={form.contact_method}
            onChange={(event) => updateField("contact_method", event.target.value)}
            placeholder="SL IM, Discord, or email"
            required
          />
        </label>

        <div className="place-post-form-actions">
          <button type="submit">Submit Sponsor Request</button>
        </div>
      </form>
    </section>
  );
}

export default SponsorsPage;
