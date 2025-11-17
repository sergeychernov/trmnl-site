import { ReactNode } from "react";
import RequireAuthClient from "./RequireAuthClient";

export default function ProfileLayout({ children }: { children: ReactNode }) {
	return <RequireAuthClient>{children}</RequireAuthClient>;
}


