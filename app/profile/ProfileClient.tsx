"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import ProfileTabs from "./Tabs";

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
			<div className="mx-auto max-w-lg px-4 sm:px-6 py-10">
				<div className="text-sm opacity-70">Загрузка...</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-lg px-4 sm:px-6 py-10">
			<h1 className="text-2xl font-semibold mb-4">Профиль</h1>
			<ProfileTabs />

			{oauthError ? (
				<div className="rounded-md border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm mb-4">
					{oauthError}
				</div>
			) : null}

			<div className="space-y-4">
				<div className="rounded-md bg-gray-100 dark:bg-neutral-800 p-4">
					<div className="text-sm opacity-80">Вы вошли как</div>
					<div className="font-medium">{session?.user?.name || session?.user?.email}</div>
				</div>
				{isYandexLinked === false && (
					<button
						onClick={() => signIn("yandex", { callbackUrl: "/profile" })}
						className="w-full rounded-md border py-2.5"
						disabled={linkLoading}
					>
						Привязать Яндекс
					</button>
				)}
				{isYandexLinked === true && (
					<button
						onClick={handleUnlink}
						className="w-full rounded-md border py-2.5"
						disabled={linkLoading}
					>
						Отвязать Яндекс
					</button>
				)}
				<button
					onClick={async () => {
						const res = await signOut({ redirect: false });
						// Делаем переход сами, чтобы сохранить текущий хост
						router.push("/auth");
					}}
					className="w-full rounded-md bg-gray-800 text-white py-2.5 hover:bg-black transition"
				>
					Выйти
				</button>
			</div>
		</div>
	);
}


