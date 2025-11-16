"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

export default function SettingsTabs() {
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  return (
    <Box sx={{ mb: 2 }}>
      <Tabs
        value={
          pathname?.startsWith(`/profile/devices/${encodeURIComponent(id)}/info`)
            ? "info"
            : "plugins"
        }
        aria-label="Настройки устройства"
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab
          label="Плагины"
          value="plugins"
          component={Link}
          href={`/profile/devices/${encodeURIComponent(id)}`}
        />
        <Tab
          label="Информация"
          value="info"
          component={Link}
          href={`/profile/devices/${encodeURIComponent(id)}/info`}
        />
      </Tabs>
    </Box>
  );
}


