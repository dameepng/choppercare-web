"use client";

import { useEffect, useState } from "react";

const CACHE_KEY = "choppercare-emergency-location";
const REQUEST_TIMEOUT_MS = 10000;

function readCachedLocation() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(CACHE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

function writeCachedLocation(payload) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {}
}

async function reverseGeocode(lat, lng) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error("Reverse geocode gagal.");
    }

    const payload = await response.json();
    const address = payload.address || {};

    return (
      address.city ||
      address.county ||
      address.municipality ||
      address.city_district ||
      address.town ||
      address.village ||
      null
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function useEmergencyLocation() {
  const [status, setStatus] = useState("idle");
  const [coordinates, setCoordinates] = useState(null);
  const [cityName, setCityName] = useState(null);
  const [error, setError] = useState(null);
  const [restoredFromCache, setRestoredFromCache] = useState(false);

  useEffect(() => {
    const cached = readCachedLocation();

    if (!cached?.coordinates) {
      return;
    }

    setCoordinates(cached.coordinates);
    setCityName(cached.cityName || null);
    setStatus("success");
    setRestoredFromCache(true);
  }, []);

  const requestPermission = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setError("Browser ini tidak mendukung akses GPS.");
      return;
    }

    setStatus("loading");
    setError(null);
    setRestoredFromCache(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        let nextCityName = null;

        try {
          nextCityName = await reverseGeocode(
            nextCoordinates.lat,
            nextCoordinates.lng,
          );
        } catch {
          nextCityName = null;
        }

        setCoordinates(nextCoordinates);
        setCityName(nextCityName);
        setStatus("success");

        writeCachedLocation({
          coordinates: nextCoordinates,
          cityName: nextCityName,
          cachedAt: Date.now(),
        });
      },
      (geolocationError) => {
        if (geolocationError.code === 1) {
          setStatus("denied");
          setError("Akses GPS ditolak. Aktifkan izin lokasi lalu coba lagi.");
          return;
        }

        if (geolocationError.code === 3) {
          setStatus("error");
          setError("Waktu deteksi lokasi habis. Pastikan GPS aktif lalu coba lagi.");
          return;
        }

        setStatus("error");
        setError("Lokasi tidak bisa dideteksi saat ini. Coba lagi sebentar.");
      },
      {
        enableHighAccuracy: true,
        timeout: REQUEST_TIMEOUT_MS,
        maximumAge: 0,
      },
    );
  };

  return {
    status,
    coordinates,
    cityName,
    error,
    restoredFromCache,
    requestPermission,
  };
}
