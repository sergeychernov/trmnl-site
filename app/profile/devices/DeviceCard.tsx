"use client";

import Link from "next/link";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";

type Device = {
	id: string;
	hash: string;
	role: string | null;
	firmwareVersion: string | null;
	model: string | null;
	address: string | null;
	room: string | null;
};

export default function DeviceCard({ device }: { device: Device }) {
	const secondary = [
		device.firmwareVersion ?? "—",
		device.role || undefined,
		device.address || undefined,
		device.room || undefined,
	]
		.filter(Boolean)
		.join(" · ");
	return (
		<ListItemButton
			component={Link}
			href={`/profile/devices/${encodeURIComponent(device.hash)}`}
			title="Открыть настройки устройства"
		>
			<ListItemText
				primaryTypographyProps={{ fontWeight: 500 }}
				primary={device.model || "—"}
				secondary={secondary}
			/>
		</ListItemButton>
	);
}


