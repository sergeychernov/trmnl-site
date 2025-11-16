"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";

export default function Providers({ children }: { children: React.ReactNode }) {
	const theme = createTheme({
		palette: {
			mode: "light",
		},
	});
	return (
		<AppRouterCacheProvider options={{ key: "mui" }}>
			<SessionProvider>
				<ThemeProvider theme={theme}>
					<CssBaseline />
					{children}
				</ThemeProvider>
			</SessionProvider>
		</AppRouterCacheProvider>
	);
}


