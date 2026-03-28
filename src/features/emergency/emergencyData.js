const DATA_URL = "/data/choppercare_emergency_contacts.json";
const MAX_NEAREST_CITY_DISTANCE_KM = 100;

const CATEGORY_ALIASES = {
  terpadu_112: "terpadu_112",
  darurat_terpadu: "terpadu_112",
  polisi: "polisi",
  damkar: "damkar",
  basarnas: "basarnas",
  ambulans: "ambulans",
  ambulans_1: "ambulans",
  ambulans_2: "ambulans",
  bpbd: "bpbd",
  bpbd_bencana: "bpbd",
  pmi: "pmi",
  posko_bencana: "posko_bencana",
};

const FALLBACK_NATIONAL_CONTACTS = {
  description:
    "Nomor darurat nasional berlaku di seluruh Indonesia dan bisa dipakai sebagai fallback saat kontak lokal belum tersedia.",
  contacts: {
    terpadu_112: [
      {
        label: "Darurat Terpadu",
        number: "112",
        dialNumber: "112",
      },
    ],
    polisi: [
      {
        label: "Polisi",
        number: "110",
        dialNumber: "110",
      },
    ],
    damkar: [
      {
        label: "Pemadam Kebakaran",
        number: "113",
        dialNumber: "113",
      },
    ],
    basarnas: [
      {
        label: "Basarnas",
        number: "115",
        dialNumber: "115",
      },
    ],
    ambulans: [
      {
        label: "Ambulans",
        number: "118",
        dialNumber: "118",
      },
      {
        label: "SPGDT Kemenkes",
        number: "119",
        dialNumber: "119",
      },
    ],
    bpbd: [
      {
        label: "BNPB",
        number: "117",
        dialNumber: "117",
      },
      {
        label: "Posko Bencana",
        number: "129",
        dialNumber: "129",
      },
    ],
  },
};

let emergencyDataCache = null;
let emergencyDataPromise = null;

function humanizeLabel(rawLabel) {
  if (!rawLabel) {
    return "Utama";
  }

  return rawLabel
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function cleanDialNumber(number) {
  return String(number).replace(/[^\d+]/g, "");
}

function splitNumberVariants(value) {
  return String(value)
    .replace(/^Hubungi\s+/i, "")
    .split(/\s+atau\s+|\/|;|,/i)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLeafValue(categoryKey, rawLabel, rawValue) {
  if (rawValue == null) {
    return [];
  }

  if (typeof rawValue === "string") {
    return splitNumberVariants(rawValue).map((number, index) => ({
      key: `${categoryKey}-${rawLabel || "utama"}-${index}`,
      label:
        splitNumberVariants(rawValue).length > 1
          ? `${humanizeLabel(rawLabel)} ${index + 1}`
          : humanizeLabel(rawLabel),
      number,
      dialNumber: cleanDialNumber(number),
      note: null,
    }));
  }

  if (typeof rawValue === "object") {
    if ("nomor" in rawValue) {
      const number = rawValue.nomor;

      return splitNumberVariants(number).map((item, index) => ({
        key: `${categoryKey}-${rawLabel || "utama"}-${index}`,
        label: rawValue.nama || humanizeLabel(rawLabel),
        number: item,
        dialNumber: cleanDialNumber(item),
        note: rawValue.catatan || null,
      }));
    }

    return Object.entries(rawValue).flatMap(([entryLabel, entryValue]) =>
      normalizeLeafValue(categoryKey, entryLabel, entryValue),
    );
  }

  return [];
}

function normalizeCategoryMap(rawContacts) {
  return Object.entries(rawContacts || {}).reduce((accumulator, [rawKey, rawValue]) => {
    const canonicalKey = CATEGORY_ALIASES[rawKey] || rawKey;
    const normalizedEntries = normalizeLeafValue(canonicalKey, rawKey, rawValue);

    if (normalizedEntries.length === 0) {
      return accumulator;
    }

    if (!accumulator[canonicalKey]) {
      accumulator[canonicalKey] = [];
    }

    accumulator[canonicalKey].push(...normalizedEntries);
    return accumulator;
  }, {});
}

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function loadEmergencyData() {
  if (emergencyDataCache) {
    return emergencyDataCache;
  }

  if (!emergencyDataPromise) {
    emergencyDataPromise = fetch(DATA_URL, { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Gagal memuat data kontak darurat lokal.");
        }

        return response.json();
      })
      .then((data) => {
        emergencyDataCache = data;
        return data;
      })
      .finally(() => {
        emergencyDataPromise = null;
      });
  }

  return emergencyDataPromise;
}

export async function findNearestCity(lat, lng) {
  const data = await loadEmergencyData();
  const cities = Array.isArray(data.kota) ? data.kota : [];

  if (cities.length === 0) {
    throw new Error("Database kota darurat belum tersedia.");
  }

  const nearest = cities.reduce((currentNearest, city) => {
    const distanceKm = haversineDistance(
      lat,
      lng,
      city.koordinat.lat,
      city.koordinat.lng,
    );

    if (!currentNearest || distanceKm < currentNearest.distanceKm) {
      return {
        id: city.id,
        city,
        distanceKm,
        isFallback: distanceKm > MAX_NEAREST_CITY_DISTANCE_KM,
      };
    }

    return currentNearest;
  }, null);

  return {
    id: nearest.id,
    cityName: nearest.city.kota,
    provinceName: nearest.city.provinsi,
    distanceKm: Number(nearest.distanceKm.toFixed(1)),
    isFallback: nearest.isFallback,
    raw: nearest.city,
  };
}

export async function getEmergencyContacts(cityId) {
  const data = await loadEmergencyData();
  const city = (data.kota || []).find((entry) => entry.id === cityId);

  if (!city) {
    throw new Error("Kota terdekat tidak ditemukan di database lokal.");
  }

  return {
    city,
    contacts: normalizeCategoryMap(city.darurat),
  };
}

export async function getNationalContacts() {
  try {
    const data = await loadEmergencyData();

    return {
      description:
        data.nomor_nasional?.description || FALLBACK_NATIONAL_CONTACTS.description,
      contacts: normalizeCategoryMap(data.nomor_nasional?.services || {}),
    };
  } catch {
    return FALLBACK_NATIONAL_CONTACTS;
  }
}

export { FALLBACK_NATIONAL_CONTACTS };
