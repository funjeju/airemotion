import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// locale 인지형 Link / useRouter / usePathname 래퍼.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
