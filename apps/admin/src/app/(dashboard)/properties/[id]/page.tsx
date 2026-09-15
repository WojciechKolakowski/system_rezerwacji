import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@system-rezerwacji/shared";
import { addChecklistTask, applyPackageToProperty, removeChecklistItem } from "../actions";

export default async function PropertyChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [property, catalogTasks, packages] = await Promise.all([
    prisma.propertyAddress.findUnique({
      where: { id },
      include: {
        client: { include: { user: true } },
        checklistItems: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.checklistTaskCatalog.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    prisma.checklistPackage.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!property) {
    notFound();
  }

  return (
    <div>
      <Link href="/properties" className="mb-4 inline-block text-sm text-emerald-700 underline">
        ← Wszystkie nieruchomości
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">
        {property.label} — {property.street} {property.buildingNo}
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {property.client.user.name} ({property.client.user.email})
      </p>

      <div className="mb-6 max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <ul className="divide-y divide-gray-100">
          {property.checklistItems.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-4 py-2 text-sm">
              {item.label}
              <form action={removeChecklistItem}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="propertyAddressId" value={property.id} />
                <button type="submit" className="text-xs text-red-500 hover:text-red-700">
                  Usuń
                </button>
              </form>
            </li>
          ))}
          {property.checklistItems.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-gray-400">
              Checklista jest pusta — dodaj czynności poniżej.
            </li>
          )}
        </ul>
      </div>

      <div className="mb-6 max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Dodaj paczkę na skróty</h2>
        <div className="flex flex-wrap gap-2">
          {packages.map((pkg) => (
            <form key={pkg.id} action={applyPackageToProperty}>
              <input type="hidden" name="propertyAddressId" value={property.id} />
              <input type="hidden" name="packageId" value={pkg.id} />
              <button
                type="submit"
                className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-emerald-500 hover:text-emerald-700"
              >
                + {pkg.name}
              </button>
            </form>
          ))}
          {packages.length === 0 && <p className="text-sm text-gray-500">Brak paczek.</p>}
        </div>
      </div>

      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Dodaj pojedynczą czynność</h2>
        {catalogTasks.length === 0 ? (
          <p className="text-sm text-gray-500">
            Katalog jest pusty —{" "}
            <Link href="/checklist-catalog" className="text-emerald-700 underline">
              dodaj czynności
            </Link>
            .
          </p>
        ) : (
          <form action={addChecklistTask} className="flex gap-2">
            <input type="hidden" name="propertyAddressId" value={property.id} />
            <select
              name="taskId"
              required
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {catalogTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Dodaj
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
