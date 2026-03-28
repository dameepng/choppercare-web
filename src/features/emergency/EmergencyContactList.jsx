"use client";

const CATEGORY_META = {
  terpadu_112: {
    icon: "📞",
    label: "Darurat Terpadu",
  },
  polisi: {
    icon: "🚓",
    label: "Polisi",
  },
  damkar: {
    icon: "🚒",
    label: "Damkar",
  },
  basarnas: {
    icon: "🆘",
    label: "Basarnas",
  },
  ambulans: {
    icon: "🚑",
    label: "Ambulans",
  },
  bpbd: {
    icon: "🏥",
    label: "BPBD / BNPB",
  },
  pmi: {
    icon: "⛑️",
    label: "PMI",
  },
  posko_bencana: {
    icon: "🏕️",
    label: "Posko Bencana",
  },
};

const CATEGORY_ORDER = [
  "terpadu_112",
  "polisi",
  "damkar",
  "basarnas",
  "ambulans",
  "bpbd",
  "pmi",
  "posko_bencana",
];

export default function EmergencyContactList({ contacts }) {
  const orderedCategories = CATEGORY_ORDER.filter(
    (category) => Array.isArray(contacts?.[category]) && contacts[category].length > 0,
  );

  if (orderedCategories.length === 0) {
    return null;
  }

  return (
    <div className="ec-list">
      {orderedCategories.map((category) => {
        const meta = CATEGORY_META[category];
        const entries = contacts[category];

        return (
          <section key={category} className="ec-service-card">
            <div className="ec-service-header">
              <span className="ec-service-icon" aria-hidden="true">
                {meta?.icon || "📱"}
              </span>
              <span className="ec-service-title">{meta?.label || category}</span>
            </div>

            <div className="ec-entry-list">
              {entries.map((entry) => (
                <div key={entry.key} className="ec-entry-row">
                  <div className="ec-entry-copy">
                    <div className="ec-entry-label">{entry.label}</div>
                    <div className="ec-entry-number">{entry.number}</div>
                    {entry.note ? (
                      <div className="ec-entry-note">{entry.note}</div>
                    ) : null}
                  </div>

                  <a className="ec-call-button" href={`tel:${entry.dialNumber}`}>
                    Hubungi
                  </a>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
