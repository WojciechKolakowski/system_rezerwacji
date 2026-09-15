import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@system-rezerwacji/shared";
import { toggleTaskInPackage } from "../actions";

export default async function ChecklistPackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [pkg, allTasks] = await Promise.all([
    prisma.checklistPackage.findUnique({ where: { id }, include: { items: true } }),
    prisma.checklistTaskCatalog.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
  ]);

  if (!pkg) {
    notFound();
  }

  const selectedTaskIds = new Set(pkg.items.map((item) => item.taskId));

  return (
    <div>
      <Link href="/checklist-packages" className="mb-4 inline-block text-sm text-emerald-700 underline">
        ← Wszystkie paczki
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">{pkg.name}</h1>
      <p className="mb-6 text-sm text-gray-500">
        Zaznacz czynności z katalogu, które wchodzą w skład tej paczki.
      </p>

      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        {allTasks.length === 0 ? (
          <p className="text-sm text-gray-500">
            Katalog jest pusty —{" "}
            <Link href="/checklist-catalog" className="text-emerald-700 underline">
              dodaj czynności
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {allTasks.map((task) => (
              <li key={task.id}>
                <form action={toggleTaskInPackage} className="flex items-center gap-2 py-1">
                  <input type="hidden" name="packageId" value={pkg.id} />
                  <input type="hidden" name="taskId" value={task.id} />
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-gray-50"
                  >
                    <span
                      className={
                        selectedTaskIds.has(task.id)
                          ? "flex h-4 w-4 items-center justify-center rounded border border-emerald-600 bg-emerald-600 text-[10px] text-white"
                          : "h-4 w-4 rounded border border-gray-300"
                      }
                    >
                      {selectedTaskIds.has(task.id) ? "✓" : ""}
                    </span>
                    {task.label}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
