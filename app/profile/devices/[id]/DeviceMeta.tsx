"use client";

import type { PublicDevice } from "@/db/devices";

type DeviceMetaProps = {
	id: string;
	device: PublicDevice | null;
};

export default function DeviceMeta({ id, device }: DeviceMetaProps) {
	return (
		<p style={{ color: "#555", marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
			<span>
				ID:{" "}
				<code style={{ background: "#f2f2f2", padding: "2px 6px", borderRadius: 4 }}>
					{id || "—"}
				</code>
			</span>
			<span>
				Модель: <strong>{device?.hardware?.model ?? "—"}</strong>
			</span>
			<span>
				Разрешение:{" "}
				<strong>
					{device?.hardware?.width ?? "—"} × {device?.hardware?.height ?? "—"}
				</strong>{" "}
				px
			</span>
		</p>
	);
}


