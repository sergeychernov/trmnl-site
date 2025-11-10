export const metadata = {
  title: "Вход/Регистрация",
};

export default function AuthPage() {
  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-10">
      {/* Клиентский UI авторизации */}
      {/* @ts-expect-error Async Server Component boundary */}
      <AuthClientWrapper />
    </div>
  );
}

// Обёртка, чтобы импортировать клиентский компонент без превращения страницы в клиентскую
function AuthClientWrapper() {
  // динамический импорт клиентского компонента
  // импортируем напрямую, чтобы избежать next/dynamic в серверном контексте
  const Client = require("./AuthClient").default as React.ComponentType;
  return <Client />;
}

