"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Stack from "@mui/material/Stack";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import LinkOffOutlinedIcon from "@mui/icons-material/LinkOffOutlined";

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
	const router = useRouter();
	const secondary = [
		device.firmwareVersion ?? "—",
		device.role || undefined,
		device.address || undefined,
		device.room || undefined,
	]
		.filter(Boolean)
		.join(" · ");

	async function handleUnlink(e: React.MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		const ok = window.confirm("Отвязать это устройство от вашего профиля?");
		if (!ok) return;
		try {
			const res = await fetch("/api/device/unlink", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ hash: device.hash }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data?.ok) {
				alert("Не удалось отвязать устройство");
				return;
			}
			router.refresh();
		} catch {
			alert("Не удалось отвязать устройство");
		}
	}

	async function handleShare(e: React.MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		const email = window.prompt("Введите email пользователя для доступа к устройству");
		if (!email) return;
		try {
			const res = await fetch("/api/device/share", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ hash: device.hash, email }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data?.ok) {
				alert("Не удалось поделиться устройством");
				return;
			}
			alert("Доступ к устройству предоставлен");
		} catch {
			alert("Не удалось поделиться устройством");
		}
	}

	return (
		<ListItem
			disablePadding
			secondaryAction={
				<Stack direction="row" spacing={0.5}>
					<Tooltip title="Поделиться устройством">
						<IconButton edge="end" aria-label="share" onClick={handleShare}>
							<ShareOutlinedIcon />
						</IconButton>
					</Tooltip>
					<Tooltip title="Отвязать устройство">
						<IconButton edge="end" aria-label="unlink" onClick={handleUnlink}>
							<LinkOffOutlinedIcon />
						</IconButton>
					</Tooltip>
				</Stack>
			}
		>
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
		</ListItem>
	);
}


