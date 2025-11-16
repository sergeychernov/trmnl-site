"use client";

import type { ReactNode } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

type PageLayoutProps = {
	title: string;
	tabs?: ReactNode; // опционально
	children: ReactNode;
};

export default function PageLayout({ title, tabs, children }: PageLayoutProps) {
	return (
		<Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6, md: 8 } }}>
			<Typography variant="h5" component="h1" fontWeight={600} gutterBottom>
				{title}
			</Typography>
			{tabs}
			<Box mt={2}>{children}</Box>
		</Container>
	);
}


