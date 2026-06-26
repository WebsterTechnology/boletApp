import { useEffect, useState } from "react";
import client from "../api/client";

export default function useDisabledRules() {
  const [disabledNumbers, setDisabledNumbers] = useState([]);
  const [disabledLocations, setDisabledLocations] = useState([]);

  useEffect(() => {
    Promise.all([
      client.get("/api/admin/public-disabled-numbers"),
      client.get("/api/admin/public-disabled-locations"),
    ])
      .then(([numRes, locRes]) => {
        setDisabledNumbers((numRes.data || []).map((n) => String(n).trim()));
        setDisabledLocations((locRes.data || []).map((l) => String(l).trim().toLowerCase()));
      })
      .catch((err) => console.error("Failed to load disabled data:", err));
  }, []);

  return { disabledNumbers, disabledLocations };
}
