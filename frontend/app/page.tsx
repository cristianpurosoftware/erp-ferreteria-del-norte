import { redirect } from "next/navigation";

// Sin esto, Next.js prerenderiza esta página en build y cachea la respuesta
// con headers inconsistentes (HTTP 200 + Location), lo que rompe el RSC client
// con "An unexpected response was received from the server" tras un login.
export const dynamic = "force-dynamic";

export default function RootPage() {
  redirect("/dashboard");
}
