"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import PageLayout from "@/app/components/layouts/PageLayout";
import SettingsTabs from "../Tabs";

type Params = { id?: string };

export default function SettingsUserPage() {
	const params = useParams<Params>();
	const idParam = useMemo(() => {
		const raw = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
		return raw ?? "";
	}, [params]);

	const [userName, setUserName] = useState<string>("");
	const [userAge, setUserAge] = useState<number | "">("");
	const [address, setAddress] = useState<string>("");
	const [room, setRoom] = useState<string>("");
	const [saved, setSaved] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		async function init() {
			if (!idParam) return;
			// загрузка
			try {
				const res = await fetch(`/api/device/info?id=${encodeURIComponent(idParam)}`, { cache: "no-store" });
				if (cancelled) return;
				if (res.ok) {
					const data = await res.json().catch(() => null);
					const info = data?.info ?? {};
					const user = info?.user ?? {};
					if (user) {
						if (typeof user.name === "string") setUserName(user.name);
						if (typeof user.age === "number") setUserAge(user.age);
						if (typeof user.address === "string") setAddress(user.address);
						if (typeof user.room === "string") setRoom(user.room);
					}
					return;
				}
			} catch {
				// ignore network error
			}
			// завершили попытку загрузки
		}
		void init();
		return () => {
			cancelled = true;
		};
	}, [idParam]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setSaved(false);
		try {
			const res = await fetch(`/api/device/info`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: idParam,
					name: userName,
					age: typeof userAge === "number" ? userAge : undefined,
					address,
					room,
				}),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => null);
				setError(data?.error || "Ошибка сохранения");
				return;
			}
			setSaved(true);
		} catch {
			setError("Сетевая ошибка");
		}
	}

	return (
		<PageLayout title="Настройки" tabs={<SettingsTabs />}>
			<p style={{ color: "#555", marginBottom: 24 }}>
				ID устройства (хеш MAC): <code style={{ background: "#f2f2f2", padding: "2px 6px", borderRadius: 4 }}>{idParam || "—"}</code>
			</p>

			<form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
				<fieldset style={{ display: "grid", gap: 12 }}>
					<legend style={{ fontWeight: 600, marginBottom: 4 }}>Информация об устройстве (пользователь)</legend>
					<label style={{ display: "grid", gap: 6 }}>
						<span style={{ fontWeight: 500 }}>Имя</span>
						<input
							type="text"
							value={userName}
							onChange={(e) => setUserName(e.target.value)}
							placeholder="Иван Иванов"
							style={{
								padding: "10px 12px",
								border: "1px solid #ddd",
								borderRadius: 8,
								outline: "none",
							}}
						/>
					</label>
					<label style={{ display: "grid", gap: 6 }}>
						<span style={{ fontWeight: 500 }}>Возраст</span>
						<input
							type="number"
							min={0}
							value={userAge}
							onChange={(e) => setUserAge(e.target.value === "" ? "" : Number(e.target.value))}
							placeholder="30"
							style={{
								padding: "10px 12px",
								border: "1px solid #ddd",
								borderRadius: 8,
								outline: "none",
							}}
						/>
					</label>
					<label style={{ display: "grid", gap: 6 }}>
						<span style={{ fontWeight: 500 }}>Адрес</span>
						<input
							type="text"
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							placeholder="г. Москва, ул. Пушкина, д. 1"
							style={{
								padding: "10px 12px",
								border: "1px solid #ddd",
								borderRadius: 8,
								outline: "none",
							}}
						/>
					</label>
					<label style={{ display: "grid", gap: 6 }}>
						<span style={{ fontWeight: 500 }}>Комната</span>
						<input
							type="text"
							value={room}
							onChange={(e) => setRoom(e.target.value)}
							placeholder="Например: Гостиная"
							style={{
								padding: "10px 12px",
								border: "1px solid #ddd",
								borderRadius: 8,
								outline: "none",
							}}
						/>
					</label>
				</fieldset>

				<div style={{ display: "flex", gap: 12 }}>
					<button
						type="submit"
						style={{
							padding: "10px 16px",
							background: "black",
							color: "white",
							border: "none",
							borderRadius: 8,
							cursor: "pointer",
						}}
					>
						Сохранить
					</button>
				</div>
			</form>

			{error ? <p style={{ marginTop: 16, color: "#b91c1c" }}>{error}</p> : null}
			{saved ? (
				<p style={{ marginTop: 16, color: "#14834e" }}>
					Сохранено для ID <code style={{ background: "#f2f2f2", padding: "2px 6px", borderRadius: 4 }}>{idParam}</code>.
				</p>
			) : null}
		</PageLayout>
	);
}


