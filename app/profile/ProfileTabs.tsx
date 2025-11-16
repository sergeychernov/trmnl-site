"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

export default function ProfileTabs() {
	const pathname = usePathname();
	return (
		<Box sx={{ mb: 2 }}>
			<Tabs
				value={pathname?.startsWith("/profile/devices") ? "/profile/devices" : "/profile"}
				aria-label="Профиль навигация"
				variant="scrollable"
				scrollButtons="auto"
			>
				<Tab
					label="Авторизация"
					value="/profile"
					component={Link}
					href="/profile"
				/>
				<Tab
					label="Устройства"
					value="/profile/devices"
					component={Link}
					href="/profile/devices"
				/>
			</Tabs>
		</Box>
	);
}


