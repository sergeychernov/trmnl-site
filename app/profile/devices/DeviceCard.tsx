"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import LinkOffOutlinedIcon from "@mui/icons-material/LinkOffOutlined";
import ShareDialog from "./ShareDialog";

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
	const [shareOpen, setShareOpen] = useState(false);
	const [members, setMembers] = useState<Array<{ email: string; role: string }>>([]);
	const [membersLoaded, setMembersLoaded] = useState(false);
	const secondary = [
		device.firmwareVersion ?? "—",
		device.role || undefined,
		device.address || undefined,
		device.room || undefined,
	]
		.filter(Boolean)
		.join(" · ");

	useEffect(() => {
		let cancelled = false;
		async function loadMembers() {
			if (device.role !== "owner") return;
			try {
				const res = await fetch(`/api/device/members?hash=${encodeURIComponent(device.hash)}`, { cache: "no-store" });
				const data = (await res.json().catch(() => ({}))) as { ok?: boolean; members?: Array<{ email: string; role: string }> };
				if (!cancelled && res.ok && data?.ok && Array.isArray(data.members)) {
					setMembers(data.members);
				}
			} finally {
				if (!cancelled) setMembersLoaded(true);
			}
		}
		loadMembers();
		return () => {
			cancelled = true;
		};
	}, [device.hash, device.role]);

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
		setShareOpen(true);
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
				<Stack sx={{ width: "100%" }}>
					<ListItemText
						primaryTypographyProps={{ fontWeight: 500 }}
						primary={device.model || "—"}
						secondary={secondary}
					/>
					{device.role === "owner" ? (
						<Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
							Доступ: {membersLoaded ? (members.length > 0 ? members.map((m) => m.email).join(", ") : "—") : "загрузка..."}
						</Typography>
					) : null}
				</Stack>
			</ListItemButton>
			<ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} hash={device.hash} />
		</ListItem>
	);
}


