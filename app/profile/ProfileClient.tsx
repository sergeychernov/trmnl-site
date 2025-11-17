"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import ProfileTabs from "./ProfileTabs";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CircularProgress from "@mui/material/CircularProgress";

export default function ProfileClient() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isYandexLinked, setIsYandexLinked] = useState<boolean | null>(null);
	const [isTelegramLinked, setIsTelegramLinked] = useState<boolean | null>(null);
	const [linkLoading, setLinkLoading] = useState(false);
	const [telegramModal, setTelegramModal] = useState(false);
	const [telegramLinkData, setTelegramLinkData] = useState<{
		linkCode: string;
		botUrl: string;
		expiresAt: string;
	} | null>(null);

	const oauthError = useMemo(() => {
		const err = searchParams?.get("error");
		if (!err) return null;
		if (err === "OAuthAccountNotLinked") {
			return "Этот аккаунт Яндекс уже привязан к другому пользователю. Войдите под тем пользователем и отвяжите, затем повторите привязку.";
		}
		return "Ошибка при входе через провайдера.";
	}, [searchParams]);

	useEffect(() => {
		if (status === "unauthenticated") {
			router.replace("/auth");
		}
	}, [status, router]);

	useEffect(() => {
		let aborted = false;
		async function loadLinked() {
			if (status !== "authenticated") return;
			try {
				// Проверяем Yandex
				const yandexRes = await fetch("/api/auth/linked/yandex", { cache: "no-store" });
				if (!aborted && yandexRes.ok) {
					const data = await yandexRes.json();
					setIsYandexLinked(Boolean(data?.linked));
				}

				// Проверяем Telegram
				const telegramRes = await fetch("/api/auth/linked/telegram", { cache: "no-store" });
				if (!aborted && telegramRes.ok) {
					const data = await telegramRes.json();
					setIsTelegramLinked(Boolean(data?.linked));
				}
			} catch {
				// ignore
			}
		}
		loadLinked();
		return () => {
			aborted = true;
		};
	}, [status]);

	async function handleUnlink(provider: "yandex" | "telegram") {
		setLinkLoading(true);
		try {
			const res = await fetch(`/api/auth/unlink/${provider}`, { method: "POST" });
			if (res.ok) {
				if (provider === "yandex") {
					setIsYandexLinked(false);
				} else {
					setIsTelegramLinked(false);
				}
			} else {
				console.error(`Failed to unlink ${provider}`);
			}
		} catch (err) {
			console.error(`Error unlinking ${provider}:`, err);
		} finally {
			setLinkLoading(false);
		}
	}

	async function handleTelegramLink() {
		setLinkLoading(true);
		try {
			const res = await fetch("/api/auth/telegram/link", { method: "POST" });
			if (res.ok) {
				const data = await res.json();
				setTelegramLinkData(data);
				setTelegramModal(true);

				// Запускаем проверку статуса привязки каждые 5 секунд
				const checkInterval = setInterval(async () => {
					const statusRes = await fetch("/api/auth/linked/telegram", { cache: "no-store" });
					if (statusRes.ok) {
						const statusData = await statusRes.json();
						if (statusData.linked) {
							setIsTelegramLinked(true);
							setTelegramModal(false);
							setTelegramLinkData(null);
							clearInterval(checkInterval);
						}
					}
				}, 5000);

				// Очищаем интервал через 2 минуты (время жизни кода)
				setTimeout(() => clearInterval(checkInterval), 2 * 60 * 1000);
			} else {
				console.error("Failed to generate Telegram link code");
			}
		} catch (err) {
			console.error("Error linking Telegram:", err);
		} finally {
			setLinkLoading(false);
		}
	}

	if (status !== "authenticated") {
		return (
			<Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
				<Typography variant="body2" color="text.secondary">
					Загрузка...
				</Typography>
			</Container>
		);
	}

	return (
		<Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
			<Typography variant="h5" component="h1" fontWeight={600} gutterBottom>
				Профиль
			</Typography>
			<ProfileTabs />

			{oauthError ? (
				<Box sx={{ mb: 2 }}>
					<Alert severity="error" variant="outlined">
						{oauthError}
					</Alert>
				</Box>
			) : null}

			<Stack spacing={2.5}>
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="body2" color="text.secondary">
						Вы вошли как
					</Typography>
					<Typography variant="subtitle2">
						{session?.user?.name || session?.user?.email}
					</Typography>
				</Paper>
				{isYandexLinked === false && (
					<Button
						onClick={() => signIn("yandex", { callbackUrl: "/profile" })}
						variant="outlined"
						fullWidth
						disabled={linkLoading}
					>
						Привязать Яндекс
					</Button>
				)}
				{isYandexLinked === true && (
					<Button
						onClick={() => handleUnlink("yandex")}
						variant="outlined"
						fullWidth
						disabled={linkLoading}
					>
						Отвязать Яндекс
					</Button>
				)}
				{isTelegramLinked === false && (
					<Button
						onClick={handleTelegramLink}
						variant="outlined"
						fullWidth
						disabled={linkLoading}
					>
						Привязать Telegram
					</Button>
				)}
				{isTelegramLinked === true && (
					<Button
						onClick={() => handleUnlink("telegram")}
						variant="outlined"
						fullWidth
						disabled={linkLoading}
					>
						Отвязать Telegram
					</Button>
				)}
				<Button
					onClick={async () => {
						await signOut({ redirect: false });
						// Делаем переход сами, чтобы сохранить текущий хост
						router.push("/auth");
					}}
					variant="contained"
					fullWidth
				>
					Выйти
				</Button>
			</Stack>

			{/* Модальное окно для привязки Telegram */}
			<Dialog
				open={telegramModal}
				onClose={() => setTelegramModal(false)}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>Привязка Telegram</DialogTitle>
				<DialogContent>
					<Stack spacing={3} sx={{ pt: 2, textAlign: "center" }}>
						{telegramLinkData && (
							<>
								<Typography variant="body2" color="text.secondary">
									Отсканируйте QR-код или используйте ссылку ниже:
								</Typography>

								{/* QR Code */}
								<Box sx={{ mx: "auto", p: 2, bgcolor: "white", borderRadius: 1 }}>
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(telegramLinkData.botUrl)}`}
										alt="QR Code"
										width={200}
										height={200}
									/>
								</Box>

								{/* Link */}
								<Box
									component="a"
									href={telegramLinkData.botUrl}
									target="_blank"
									rel="noopener noreferrer"
									sx={{
										color: "primary.main",
										textDecoration: "none",
										"&:hover": { textDecoration: "underline" }
									}}
								>
									{telegramLinkData.botUrl}
								</Box>

								<Typography variant="caption" color="text.secondary">
									Код действителен в течение 2 минут
								</Typography>

								{linkLoading && (
									<CircularProgress size={24} sx={{ mx: "auto" }} />
								)}
							</>
						)}
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setTelegramModal(false)}>Закрыть</Button>
				</DialogActions>
			</Dialog>
		</Container>
	);
}


