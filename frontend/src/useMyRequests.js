import { useCallback, useEffect, useState } from "react";
import { bank } from "./api";

export default function useMyRequests() {
  const [list, setList] = useState([]);
  const load = useCallback(() => bank.get("/requests/mine").then((r) => setList(r.data)).catch(() => {}), []);
  useEffect(() => { load(); const id = setInterval(load, 8000); return () => clearInterval(id); }, [load]);
  return [list, load];
}