import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Yandex from "next-auth/providers/yandex";
import type { NextAuthConfig, User, DefaultSession, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { mongoClientPromise, getDb } from "./lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

// Безопасность: секрет обязателен
if (!process.env.NEXTAUTH_SECRET) {
	throw new Error("NEXTAUTH_SECRET is not set");
}

// Оставляем Yandex и добавляем Credentials (email/пароль)

const providers = [
	Credentials({
		name: "Email и пароль",
		credentials: {
			email: { label: "Email", type: "email" },
			password: { label: "Пароль", type: "password" },
		},
		async authorize(credentials) {
			if (!credentials?.email || !credentials?.password) return null;
			const email = String(credentials.email).toLowerCase();
			const password = String(credentials.password);
			const db = await getDb();
			const users = db.collection("users");
			type DbUser = {
				_id: ObjectId;
				email: string;
				name?: string | null;
				image?: string | null;
				passwordHash?: string | null;
			};
			const user = await users.findOne<DbUser>({
				email,
			});
			// Если пользователя нет — создаём и входим
			if (!user) {
				const passwordHash = await bcrypt.hash(password, 10);
				const insertResult = await users.insertOne({
					email,
					name: null,
					image: null,
					emailVerified: null,
					passwordHash,
				});
				return {
					id: String(insertResult.insertedId),
					email,
					name: null,
					image: null,
				} as User;
			}
			// Если пользователь есть, но пароль ещё не задан — задаём
			if (!user.passwordHash) {
				const passwordHash = await bcrypt.hash(password, 10);
				await users.updateOne({ _id: user._id }, { $set: { passwordHash } });
				return {
					id: String(user._id),
					email: user.email,
					name: user.name ?? null,
					image: user.image ?? null,
				} as User;
			}
			// Проверяем пароль
			const ok = await bcrypt.compare(password, user.passwordHash);
			if (!ok) return null;
			return {
				id: String(user._id),
				email: user.email,
				name: user.name ?? null,
				image: user.image ?? null,
			} as User;
		},
	}),
	...(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET
		? [
			Yandex({
				clientId: process.env.YANDEX_CLIENT_ID!,
				clientSecret: process.env.YANDEX_CLIENT_SECRET!,
				authorization: {
					url: "https://oauth.yandex.ru/authorize",
					params: {
						scope: "login:email",
					},
				},
			}),
		]
		: []),
] as NextAuthConfig["providers"];

export const providerIds: string[] = [
	"credentials",
	...(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET ? ["yandex"] : []),
];
export const {
	handlers: { GET, POST },
	auth,
	signIn,
	signOut,
} = NextAuth({
	// Используем ту же БД, что и задаёт URI/ENV для MongoClient
	adapter: MongoDBAdapter(mongoClientPromise),
	secret: process.env.NEXTAUTH_SECRET,
	session: { strategy: "jwt" },
	providers,
	pages: {
		signIn: "/auth",
	},
	callbacks: {
		async jwt({ token, user }: { token: JWT; user?: User }) {
			// При любом логине сохраняем userId в токене, иначе используем sub
			const maybeUser = user as Partial<User> | undefined;
			const t = token as JWT & { userId?: string };
			if (maybeUser?.id) {
				t.userId = String(maybeUser.id);
			}
			return t;
		},
		async session({ session, token }: { session: Session; token: JWT }) {
			// Прокидываем id пользователя в сессию для клиентских запросов
			const t = token as JWT & { userId?: string };
			const userId = t.userId ?? t.sub;
			const userWithId = (session.user ?? {}) as NonNullable<DefaultSession["user"]> & { id?: string };
			if (userId) {
				userWithId.id = String(userId);
			} else {
				delete (userWithId as { id?: string }).id;
			}
			session.user = userWithId;
			return session;
		},
	},
});


