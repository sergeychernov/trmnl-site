"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ProfileTabs from "../ProfileTabs";
import Link from "next/link";
import PageLayout from "@/app/components/layouts/PageLayout";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import List from "@mui/material/List";
import Button from "@mui/material/Button";
import DeviceCard from "@/app/profile/devices/DeviceCard";

export default function DevicesClient() {
  const { status } = useSession();
  const router = useRouter();
  const [devices, setDevices] = useState<Array<{ id: string; hash: string; role: string | null; firmwareVersion: string | null; model: string | null; address: string | null; room: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth");
    }
  }, [status, router]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (status !== "authenticated") return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/devices", { cache: "no-store" });
        const data: { devices?: Array<{ id: string; hash: string; role: string | null; firmwareVersion: string | null; model: string | null; address: string | null; room: string | null }> } =
          await res.json().catch(() => ({}));
        if (!cancelled) {
          setDevices(data.devices ?? []);
        }
      } catch {
        if (!cancelled) setError("Не удалось загрузить устройства");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [status]);
  return (
    <PageLayout title="Профиль" tabs={<ProfileTabs />}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">Устройства</Typography>
        {loading ? (
          <Typography variant="body2" color="text.secondary">Загрузка...</Typography>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>
        ) : devices.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            У вас пока нет подключённых устройств
          </Typography>
        ) : (
          <List dense sx={{ mt: 1 }}>
            {devices.map((d) => {
              return (
                <DeviceCard key={d.id} device={d} />
              );
            })}
          </List>
        )}
      </Paper>
      <Button
        component={Link}
        href="/profile/devices/connect"
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
      >
        Добавить устройство
      </Button>
    </PageLayout>
  );
}


