export const metadata = {
  title: "Вход/Регистрация",
};

import AuthClient from "./AuthClient";

export default function AuthPage() {
  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-10">
      <AuthClient />
    </div>
  );
}

