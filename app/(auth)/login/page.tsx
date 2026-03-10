import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle as="h1">Stok Uygulaması Giriş</CardTitle>
        <CardDescription>
          Devam etmek için kullanıcı adı ve şifrenizi girin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
