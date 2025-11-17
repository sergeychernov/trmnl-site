import { ReactNode, Suspense } from "react";
import RequireAuthClient from "./RequireAuthClient";

export default function ProfileLayout({ children }: { children: ReactNode }) {
	return (
		<Suspense fallback={<div className="mx-auto max-w-lg px-4 sm:px-6 py-10 text-sm opacity-70">Загрузка...</div>}>
			<RequireAuthClient>{children}</RequireAuthClient>
		</Suspense>
	);
}


