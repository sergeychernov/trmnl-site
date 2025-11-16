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

export default function ProfileClient() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isYandexLinked, setIsYandexLinked] = useState<boolean | null>(null);
	const [linkLoading, setLinkLoading] = useState(false);

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
				const res = await fetch("/api/auth/linked/yandex", { cache: "no-store" });
				if (!aborted && res.ok) {
					const data = await res.json();
					setIsYandexLinked(Boolean(data?.linked));
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

	async function handleUnlink() {
		setLinkLoading(true);
		try {
			const res = await fetch("/api/auth/unlink/yandex", { method: "POST" });
			if (res.ok) {
				setIsYandexLinked(false);
			}
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
						onClick={handleUnlink}
						variant="outlined"
						fullWidth
						disabled={linkLoading}
					>
						Отвязать Яндекс
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
		</Container>
	);
}


