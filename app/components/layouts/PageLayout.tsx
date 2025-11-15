"use client";

import type { ReactNode } from "react";

type PageLayoutProps = {
	title: string;
	tabs?: ReactNode; // опционально
	children: ReactNode;
};

export default function PageLayout({ title, tabs, children }: PageLayoutProps) {
	return (
		<div className="mx-auto max-w-lg lg:max-w-none px-4 sm:px-6 py-10">
			<h1 className="text-2xl font-semibold mb-4">{title}</h1>
			{tabs}
			{children}
		</div>
	);
}


