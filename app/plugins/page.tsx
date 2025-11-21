import { listPlugins } from "@/plugins";
import Link from "next/link";

export const metadata = {
  title: "Список плагинов",
};

export default async function PluginsPage() {
  const plugins = listPlugins();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">Список плагинов</h1>
      <ul className="grid gap-3">
        {plugins.map((p) => (
          <li key={p.id} className="border rounded-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs opacity-70">id: {p.id}</div>
              </div>
              <Link
                href={`/plugins/${p.id}`}
                className="text-sm px-3 py-1.5 rounded-md border hover:bg-foreground/10"
              >
                Открыть
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}


