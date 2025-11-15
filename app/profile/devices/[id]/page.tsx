import type { PublicDevice } from "@/db/devices";
import { findDeviceByHash } from "@/db/devices";
import ClientPage from "./ClientPage";

type Params = { id?: string };

export default async function Page({ params }: { params: Params }) {
  const raw = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const idParam = raw ?? "";
  const device = idParam
    ? await findDeviceByHash(idParam, { projection: { _id: 0, api_key: 0, pin: 0, mac: 0 } })
    : null;
  return <ClientPage id={idParam} device={device as PublicDevice | null} />;
}

