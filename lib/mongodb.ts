import { MongoClient, Db, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
	throw new Error("MONGODB_URI is not set");
}

// Единое имя БД для всего приложения:
// - Берём из MONGODB_DB, если задано
// - Иначе используем "trmnl" (чтобы не проваливаться в "test")
export const resolvedMongoDbName: string = process.env.MONGODB_DB || "trmnl";

type GlobalWithMongo = typeof globalThis & {
	_mongoClientPromise?: Promise<MongoClient>;
};

const g = globalThis as GlobalWithMongo;

if (!g._mongoClientPromise) {
	const client = new MongoClient(uri, {
		// Рекомендации для Vercel Functions / serverless
		maxPoolSize: 5,
		minPoolSize: 0,
		maxIdleTimeMS: 60_000,
		serverSelectionTimeoutMS: 5_000,
		appName: "vercel",
		serverApi: {
			version: ServerApiVersion.v1,
			strict: true,
			deprecationErrors: true,
		},
	});
	g._mongoClientPromise = client.connect();
}

export async function getDb(dbName?: string): Promise<Db> {
	const client = await g._mongoClientPromise!;
	return client.db(dbName || resolvedMongoDbName);
}

// Экспорт clientPromise для адаптера NextAuth
export const mongoClientPromise = (globalThis as GlobalWithMongo)._mongoClientPromise!;


