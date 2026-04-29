import { unstable_rethrow } from "next/navigation";

/**
 * Ejecuta una promesa y devuelve un fallback si falla, pero re-tira los errores
 * internos de Next.js (redirect, notFound, etc.). Necesario para que un
 * `.catch()` defensivo no se trague un `redirect()` disparado dentro de la
 * cadena (por ejemplo cuando el access token expiró y el refresh también).
 */
export async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (err) {
    unstable_rethrow(err);
    return fallback;
  }
}
