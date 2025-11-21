import { notFound } from "next/navigation";
import { getPlugin } from "@/plugins";
import { getPluginDocs } from "@/plugins/docs-registry";

type PageProps = {
	params: Promise<{ id: string }>;
};

export default async function PluginDocsPage({ params }: PageProps) {
	const { id } = await params;
	const plugin = getPlugin(id);
	if (!plugin) {
		return notFound();
	}

	// Получаем компонент документации из реестра
	const DocsComponent = getPluginDocs(plugin.id, "ru");

	return (
		<div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
			<h1 className="text-3xl font-semibold mb-2">{plugin.name}</h1>
			<p className="text-sm text-neutral-500 mb-8">id: {plugin.id}</p>

			{DocsComponent ? (
				<div className="prose prose-neutral max-w-none">
					<DocsComponent />
				</div>
			) : (
				<p className="text-sm text-neutral-500">
					Для этого плагина документация ещё не добавлена.
				</p>
			)}
		</div>
	);
}


