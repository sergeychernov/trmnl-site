import type { PublicDevice } from "@/db/devices";
import { findDeviceByHash } from "@/db/devices";
import ClientPage from "./ClientPage";

type Params = { id?: string | string[] };

export default async function Page({ params }: { params: Promise<Params> }) {
  const p = await params;
  const raw = typeof p?.id === "string" ? p.id : Array.isArray(p?.id) ? p.id[0] : "";
  const idParam = raw ?? "";
  const device = idParam
    ? await findDeviceByHash(idParam, { projection: { _id: 0, api_key: 0, pin: 0, mac: 0 } })
    : null;
  return <ClientPage id={idParam} device={device as PublicDevice | null} />;
}

