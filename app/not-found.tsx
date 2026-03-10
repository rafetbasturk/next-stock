import Link from "next/link";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("NotFoundPage");

  return (
    <section
      aria-labelledby="not-found-title"
      className="flex h-full min-h-0 items-center justify-center"
    >
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle as="h2" id="not-found-title">
            {t("title")}
          </CardTitle>
          <CardDescription as="p">{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("hint")}</p>
        </CardContent>
        <CardFooter>
          <Button nativeButton={false} variant="outline" render={<Link href="/" />}>
            {t("goHome")}
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
