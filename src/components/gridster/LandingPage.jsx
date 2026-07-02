function LandingPage({ onEnter }) {
  const features = [
    ["Social Feed", "Post moments, photos, blogs, events, outfits, and SLURLs."],
    ["Event Discovery", "Find clubs, DJs, live music, parties, and themed grid nights."],
    ["SLURL Teleport", "Jump from discovery to destinations with clear teleport cards."],
    ["Creator Tools", "Track reach, promote releases, and grow your creator presence."],
    ["Bling Bits", "Earn playful rewards for posting, discovering, and supporting creators."],
    ["Community Hubs", "Build pages for RP sims, groups, clubs, families, and fandoms."],
  ];
  const accountTypes = [
    ["✦", "Resident", "Post, follow friends, save landmarks, and discover places."],
    ["◇", "Blogger", "Share looks, credits, photo sets, and brand collaborations."],
    ["♫", "DJ / Host", "Promote sets, events, venues, and live shows."],
    ["◆", "Store Owner", "Share releases, blogger calls, sales, and marketplace finds."],
    ["⌖", "Venue / Sim Owner", "Promote events, manage discovery, and share SLURLs."],
    ["☽", "Community / RP Hub", "Build group pages, recruit members, and share stories."],
  ];
  const pricingPlans = [
    {
      title: "Free",
      subtitle: "For residents getting started.",
      features: ["Basic profile", "Post photos and updates", "Save landmarks", "Join groups"],
      button: "Start Free",
    },
    {
      title: "Plus",
      subtitle: "For bloggers, DJs, creators, and active residents.",
      features: ["Larger uploads", "Profile flair", "Bling Bits bonuses", "Boosted posts", "Advanced discovery"],
      button: "Go Plus",
      popular: true,
    },
    {
      title: "Venue / Creator",
      subtitle: "For stores, venues, sims, and communities.",
      features: ["Featured event tools", "Store and venue promotion", "Analytics dashboard", "Blogger calls", "Community hub tools"],
      button: "Build Your Hub",
    },
  ];
  const ratingCards = [
    ["General", "For family-friendly places, public showcases, shopping, art, and social discovery."],
    ["Moderate", "For nightlife, clubs, fashion, romance, beaches, and mature social spaces."],
    ["Adult", "For adult-rated venues, communities, stores, and content with proper visibility controls."],
  ];
  const safetyPills = ["Rating Tags", "Mature Filters", "Creator Credit", "Clear SLURLs"];
  const roadmapCards = [
    ["Phase One", "Foundation", "Social profiles, posts, photos, SLURLs, groups, and event discovery.", "In Design"],
    ["Phase Two", "Creator Growth", "Bling Bits, profile flair, boosted posts, creator analytics, and blogger tools.", "Planned"],
    ["Phase Three", "Grid Business Tools", "Venue dashboards, store pages, community hubs, blogger calls, and live event tools.", "Building Soon"],
    ["Future Ideas", "Discovery Experiments", "Mobile-friendly browsing, advanced search, photo contests, creator awards, and featured grid guides.", "Dream List"],
  ];
  const faqCards = [
    [
      "What is Gridster?",
      "Gridster is a Second Life social hub for posting, discovering events, saving SLURLs, finding creators, and teleporting into what is happening across the grid.",
    ],
    [
      "Is Gridster only for bloggers?",
      "No. Gridster is for residents, bloggers, photographers, DJs, hosts, store owners, venues, RP communities, and anyone who wants to connect across Second Life.",
    ],
    [
      "What are Bling Bits?",
      "Bling Bits are Gridster’s reward currency. Users can earn them through posting, discovery, events, and creator support, then use them for boosts, flair, and featured visibility.",
    ],
    [
      "Can stores and venues use Gridster?",
      "Yes. Stores can promote releases, blogger calls, and marketplace finds. Venues can promote events, lineups, live DJs, and SLURLs.",
    ],
    [
      "Does Gridster support Adult, Moderate, and General content?",
      "Yes. Gridster should support content rating tags and discovery filters so users know what kind of space or post they are viewing.",
    ],
    [
      "Is Gridster connected directly to Second Life?",
      "For now, this is a website concept and dashboard mockup. The design should be ready for future SLURL links, profiles, event discovery, and creator tools.",
    ],
  ];

  const showFeatures = () => {
    document.getElementById("landing-features")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="gridster-landing">
      <section className="landing-hero">
        <div className="landing-brand">
          <img className="landing-logo" src="/gridster-logo.png" alt="Gridster logo" />
          <div>
            <h1>Gridster</h1>
            <p>Post • Discover • Teleport</p>
          </div>
        </div>

        <div className="landing-copy">
          <span>Second Life social discovery</span>
          <h2>Your Second Life social hub.</h2>
          <p>
            Discover events, stores, creators, photo spots, communities, and places to teleport across the grid.
          </p>
        </div>

        <div className="landing-actions">
          <button className="landing-primary" onClick={onEnter}>Enter Gridster</button>
          <button className="landing-secondary" onClick={showFeatures}>Explore Features</button>
        </div>
      </section>

      <section className="landing-feature-panel glass-card" id="landing-features">
        <div className="landing-section-heading">
          <span>What Gridster Connects</span>
          <h3>Built for residents, creators, clubs, stores, and communities.</h3>
        </div>

        <div className="landing-feature-grid">
          {features.map(([title, desc], index) => (
            <article className="landing-feature-card" key={title}>
              <span className={`landing-feature-icon landing-feature-${index}`}>✦</span>
              <h4>{title}</h4>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-path-panel glass-card">
        <div className="landing-path-heading">
          <span>Account Types</span>
          <h3>Choose Your Gridster Path</h3>
          <p>
            Whether you post, perform, sell, host, blog, roleplay, or explore — Gridster gives your Second Life a home.
          </p>
        </div>

        <div className="landing-path-grid">
          {accountTypes.map(([icon, title, desc], index) => (
            <article className="landing-path-card" key={title}>
              <span className={`landing-path-icon landing-path-${index}`}>{icon}</span>
              <h4>{title}</h4>
              <p>{desc}</p>
              <button>Select</button>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-plus-panel glass-card">
        <div className="landing-plus-heading">
          <span>Premium Preview</span>
          <h3>Gridster Plus</h3>
          <p>Extra sparkle for creators, venues, stores, and residents who want more reach across the grid.</p>
        </div>

        <div className="landing-pricing-grid">
          {pricingPlans.map((plan) => (
            <article className={`landing-pricing-card ${plan.popular ? "pricing-card-popular" : ""}`} key={plan.title}>
              {plan.popular ? <span className="pricing-badge">Most Popular</span> : null}
              <h4>{plan.title}</h4>
              <p>{plan.subtitle}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button>{plan.button}</button>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-safety-panel glass-card">
        <div className="landing-safety-heading">
          <span>Safety & Ratings</span>
          <h3>Built for the Grid, Rated for the Grid</h3>
          <p>Gridster helps residents discover content while respecting General, Moderate, and Adult spaces.</p>
        </div>

        <div className="landing-rating-grid">
          {ratingCards.map(([title, desc]) => (
            <article className={`landing-rating-card rating-${title.toLowerCase()}`} key={title}>
              <span>{title}</span>
              <p>{desc}</p>
            </article>
          ))}
        </div>

        <div className="landing-safety-note">
          <p>Gridster should make discovery easier without hiding ratings, consent, credits, or community rules.</p>
          <div className="landing-safety-pills">
            {safetyPills.map((pill) => (
              <span key={pill}>{pill}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-roadmap-panel glass-card">
        <div className="landing-roadmap-heading">
          <span>Roadmap</span>
          <h3>Coming to the Grid</h3>
          <p>Gridster is built to grow with Second Life residents, creators, venues, stores, and communities.</p>
        </div>

        <div className="landing-roadmap-grid">
          {roadmapCards.map(([phase, title, desc, status], index) => (
            <article className="landing-roadmap-card" key={phase}>
              <div className="roadmap-node" aria-hidden="true">{index + 1}</div>
              <span className="roadmap-phase">{phase}</span>
              <h4>{title}</h4>
              <p>{desc}</p>
              <span className={`roadmap-status roadmap-status-${index}`}>{status}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-faq-panel glass-card">
        <div className="landing-faq-heading">
          <span>Questions</span>
          <h3>Gridster FAQ</h3>
          <p>Quick answers for residents, creators, DJs, bloggers, stores, venues, and communities.</p>
        </div>

        <div className="landing-faq-grid">
          {faqCards.map(([question, answer], index) => (
            <article className="landing-faq-card" key={question}>
              <span className="faq-number">{String(index + 1).padStart(2, "0")}</span>
              <h4>{question}</h4>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final-cta glass-card">
        <div className="landing-final-copy">
          <span>Gridster Awaits</span>
          <h3>Ready to step onto the grid?</h3>
          <p>Post your world, discover what’s happening, collect Bling Bits, and teleport into the action.</p>
        </div>

        <div className="landing-final-actions">
          <button className="landing-primary" onClick={onEnter}>Enter Gridster</button>
          <button className="landing-secondary" onClick={showFeatures}>View Features</button>
        </div>

        <div className="landing-final-pills">
          <span>SLURL Ready</span>
          <span>Event First</span>
          <span>Creator Friendly</span>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;