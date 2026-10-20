import { notFound } from "next/navigation";
import { DashboardApp } from "@/components/dashboard-app";
import { sections, slug } from "@/lib/data";
export function generateStaticParams() {
  return sections.slice(1).map((name) => ({ section: slug(name) }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const name = sections.find((name) => slug(name) === section);
  if (!name) notFound();
  return <DashboardApp section={name} />;
}
