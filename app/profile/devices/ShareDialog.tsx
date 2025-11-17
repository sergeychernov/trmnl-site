"use client";

import { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";

export default function ShareDialog({
	open,
	onClose,
	hash,
}: {
	open: boolean;
	onClose: () => void;
	hash: string;
}) {
	const [email, setEmail] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const emailValid = useMemo(() => {
		const v = email.trim();
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
	}, [email]);

	async function submit() {
		setSubmitting(true);
		setError(null);
		setSuccess(null);
		try {
			const res = await fetch("/api/device/share", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ hash, email: email.trim(), role: "editor" }),
			});
			const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
			if (!res.ok || !data?.ok) {
				const code = data?.error || "unknown_error";
				let msg = "Не удалось поделиться устройством";
				if (code === "device_not_found") msg = "Устройство с таким идентификатором не найдено";
				if (code === "user_not_found") msg = "Пользователь с таким email не найден";
				if (code === "unauthorized") msg = "Необходима авторизация";
				setError(msg);
				return;
			}
			setSuccess("Доступ к устройству предоставлен (роль: редактор)");
		} catch {
			setError("Не удалось поделиться устройством");
		} finally {
			setSubmitting(false);
		}
	}

	function handleClose() {
		if (submitting) return;
		setEmail("");
		setError(null);
		setSuccess(null);
		onClose();
	}

	return (
		<Dialog open={open} onClose={handleClose}>
			<DialogTitle>Поделиться устройством</DialogTitle>
			<DialogContent>
				<DialogContentText sx={{ mb: 2 }}>
					Введите email пользователя, которому нужно дать доступ к устройству. Роль будет «редактор».
				</DialogContentText>
				{error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
				{success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}
				<TextField
					autoFocus
					fullWidth
					type="email"
					label="Email пользователя"
					placeholder="user@example.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					disabled={submitting || !!success}
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose} disabled={submitting}>
					{success ? "Закрыть" : "Отмена"}
				</Button>
				{!success ? (
					<Button
						variant="contained"
						onClick={submit}
						disabled={!emailValid || submitting}
						startIcon={submitting ? <CircularProgress size={18} /> : undefined}
					>
						Отправить
					</Button>
				) : null}
			</DialogActions>
		</Dialog>
	);
}


