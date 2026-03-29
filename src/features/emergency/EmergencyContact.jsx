"use client";

import { useEffect, useState } from "react";

import EmergencyContactList from "./EmergencyContactList";
import {
  FALLBACK_NATIONAL_CONTACTS,
  findNearestCity,
  getEmergencyContacts,
  getNationalContacts,
} from "./emergencyData";
import { useEmergencyLocation } from "./useEmergencyLocation";

export default function EmergencyContact() {
  const {
    status,
    coordinates,
    cityName,
    error,
    restoredFromCache,
    requestPermission,
  } =
    useEmergencyLocation();
  const [isExpanded, setIsExpanded] = useState(true);

  const [nearestCity, setNearestCity] = useState(null);
  const [cityContacts, setCityContacts] = useState(null);
  const [nationalContacts, setNationalContacts] = useState(
    FALLBACK_NATIONAL_CONTACTS,
  );
  const [dataStatus, setDataStatus] = useState("idle");
  const [dataError, setDataError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getNationalContacts().then((result) => {
      if (!cancelled) {
        setNationalContacts(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "success" || !coordinates) {
      return undefined;
    }

    let cancelled = false;

    async function resolveNearestContacts() {
      setDataStatus("loading");
      setDataError(null);

      try {
        const nearest = await findNearestCity(coordinates.lat, coordinates.lng);
        const contactData = await getEmergencyContacts(nearest.id);

        if (cancelled) {
          return;
        }

        setNearestCity(nearest);
        setCityContacts(contactData.contacts);
        setDataStatus("success");
      } catch {
        if (cancelled) {
          return;
        }

        setNearestCity(null);
        setCityContacts(null);
        setDataError(
          "Data kontak darurat lokal belum bisa dimuat. Gunakan nomor nasional di bawah ini.",
        );
        setDataStatus("error");
      }
    }

    resolveNearestContacts();

    return () => {
      cancelled = true;
    };
  }, [coordinates, status]);

  useEffect(() => {
    if (restoredFromCache) {
      setIsExpanded(false);
    }
  }, [restoredFromCache]);

  if (!isExpanded) {
    return (
      <section className="ec-shell" aria-label="Kontak darurat terdekat">
        <button className="ec-collapse-toggle" onClick={() => setIsExpanded(true)}>
          <span className="ec-collapse-icon" aria-hidden="true">
            🚨
          </span>
          <span className="ec-collapse-copy">
            <span className="ec-collapse-title">Kontak Darurat Terdekat</span>
            <span className="ec-collapse-subtitle">
              Buka lagi panel kontak darurat berbasis GPS
            </span>
          </span>
        </button>
      </section>
    );
  }

  const renderBackButton = () => (
    <button className="ec-back-button" onClick={() => setIsExpanded(false)}>
      ← Kembali ke Chat
    </button>
  );

  const renderNationalFallback = (message) => (
    <div className="ec-card ec-card-fallback">
      {renderBackButton()}
      <div className="ec-warning">{message}</div>
      <EmergencyContactList contacts={nationalContacts.contacts} />
    </div>
  );

  if (status === "idle") {
    return (
      <section className="ec-shell" aria-label="Kontak darurat terdekat">
        <div className="ec-card">
          {renderBackButton()}
          <div className="ec-kicker">Kontak Darurat Terdekat</div>
          <h2 className="ec-title">Butuh nomor bantuan di sekitar lokasimu?</h2>
          <p className="ec-subtext">
            Aktifkan GPS untuk melihat nomor darurat yang paling relevan di kota
            atau kabupaten terdekat.
          </p>
          <button className="ec-primary-button" onClick={requestPermission}>
            🚨 Temukan Kontak Darurat Terdekat
          </button>
        </div>
      </section>
    );
  }

  if (status === "loading") {
    return (
      <section className="ec-shell" aria-label="Kontak darurat terdekat">
        <div className="ec-card ec-card-loading">
          {renderBackButton()}
          <div className="ec-spinner" aria-hidden="true" />
          <div className="ec-loading-text">Mendeteksi lokasi...</div>
        </div>
      </section>
    );
  }

  if (status === "denied") {
    return (
      <section className="ec-shell" aria-label="Kontak darurat terdekat">
        <div className="ec-card">
          {renderBackButton()}
          <div className="ec-warning">Akses GPS ditolak.</div>
          <p className="ec-subtext">
            Izinkan lokasi agar kami bisa mencari kontak darurat terdekat. Sementara
            itu, gunakan nomor nasional berikut.
          </p>
          <EmergencyContactList contacts={nationalContacts.contacts} />
          <button className="ec-secondary-button" onClick={requestPermission}>
            Coba Lagi
          </button>
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="ec-shell" aria-label="Kontak darurat terdekat">
        <div className="ec-card">
          {renderBackButton()}
          <div className="ec-warning">{error || "Lokasi tidak bisa dideteksi."}</div>
          <p className="ec-subtext">
            Gunakan nomor nasional berikut sambil mencoba mendeteksi lokasi lagi.
          </p>
          <EmergencyContactList contacts={nationalContacts.contacts} />
          <button className="ec-secondary-button" onClick={requestPermission}>
            Coba Lagi
          </button>
        </div>
      </section>
    );
  }

  if (dataStatus === "loading") {
    return (
      <section className="ec-shell" aria-label="Kontak darurat terdekat">
        <div className="ec-card ec-card-loading">
          {renderBackButton()}
          <div className="ec-spinner" aria-hidden="true" />
          <div className="ec-loading-text">Menyiapkan kontak darurat terdekat...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="ec-shell" aria-label="Kontak darurat terdekat">
      <div className="ec-card">
        {renderBackButton()}
        <div className="ec-kicker">Kontak Darurat Terdekat</div>
        <h2 className="ec-title">
          📍 Kontak Darurat — {nearestCity?.cityName || cityName || "Lokasi Terdekat"}
        </h2>

        {nearestCity ? (
          <p className="ec-meta">
            ~{nearestCity.distanceKm} km dari lokasimu
            {nearestCity.provinceName ? ` • ${nearestCity.provinceName}` : ""}
          </p>
        ) : null}

        {cityName && nearestCity?.cityName !== cityName ? (
          <p className="ec-subtext">Lokasi GPS terdeteksi di sekitar {cityName}.</p>
        ) : null}

        {nearestCity?.isFallback ? (
          <div className="ec-flag">
            Kota terdekat berada lebih dari 100 km. Hasil ini mungkin tidak sepenuhnya
            akurat untuk area Anda.
          </div>
        ) : null}

        {dataError ? <div className="ec-flag">{dataError}</div> : null}

        {cityContacts ? <EmergencyContactList contacts={cityContacts} /> : null}

        <div className="ec-footer">
          Nomor nasional berlaku di seluruh Indonesia.
        </div>
        <EmergencyContactList contacts={nationalContacts.contacts} />
        <button className="ec-secondary-button" onClick={requestPermission}>
          Perbarui Lokasi
        </button>
      </div>

      {dataStatus === "error" ? renderNationalFallback(dataError) : null}
    </section>
  );
}
