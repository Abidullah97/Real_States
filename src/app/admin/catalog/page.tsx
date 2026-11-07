import { redirect } from "next/navigation";

/** The combined catalog page was split into Categories and Locations. */
export default function CatalogRedirect() {
  redirect("/admin/categories");
}
