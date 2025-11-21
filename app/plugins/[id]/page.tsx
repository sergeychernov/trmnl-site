import { notFound } from "next/navigation";
import { getPlugin } from "@/plugins";
import { MDXRemote } from "next-mdx-remote/rsc";
import { promises as fs } from "fs";
import path from "path";

type PageProps = {
	params: Promise<{ id: string }>;
};

async function getPluginMDXContent(pluginId: string, locale: string = "ru") {
	const mdxPath = path.join(process.cwd(), "plugins", pluginId, "docs", `${locale}.mdx`);

	try {
		const source = await fs.readFile(mdxPath, "utf-8");
		return source;
	} catch (error) {
		return null;
	}
}

export default async function PluginDocsPage({ params }: PageProps) {
	const { id } = await params;
	const plugin = getPlugin(id);
	if (!plugin) {
		return notFound();
	}

	// Загружаем MDX контент на сервере
	const mdxSource = await getPluginMDXContent(plugin.id, "ru");

	return (
		<div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
			<h1 className="text-3xl font-semibold mb-2">{plugin.name}</h1>
			<p className="text-sm text-neutral-500 mb-8">id: {plugin.id}</p>

			{mdxSource ? (
				<div className="prose prose-neutral max-w-none">
					<MDXRemote source={mdxSource} />
				</div>
			) : (
				<p className="text-sm text-neutral-500">
					Для этого плагина документация ещё не добавлена.
				</p>
			)}
		</div>
	);
}


