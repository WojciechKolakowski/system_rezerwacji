import Link from "next/link";
import { prisma } from "@system-rezerwacji/shared";
import { createTask, toggleTaskActive } from "./actions";

export default async function ChecklistCatalogPage() {
  const tasks = await prisma.checklistTaskCatalog.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Katalog czynności</h1>
      <p className="mb-6 text-sm text-gray-500">
        Globalna pula czynności, z której admin wybiera przy konfigurowaniu checklisty
        konkretnej nieruchomości (bezpośrednio albo przez{" "}
        <Link href="/checklist-packages" className="text-emerald-700 underline">
          paczkę-skrót
        </Link>
        ).
      </p>

      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Treść</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <tr key={task.id}>
                <td className="px-4 py-3">{task.label}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      task.active
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                        : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                    }
                  >
                    {task.active ? "aktywna" : "nieaktywna"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={toggleTaskActive}>
                    <input type="hidden" name="id" value={task.id} />
                    <button type="submit" className="text-xs text-gray-500 hover:text-gray-900">
                      {task.active ? "Dezaktywuj" : "Aktywuj"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  Brak czynności — dodaj pierwszą poniżej.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Dodaj czynność</h2>
        <form action={createTask} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="label" className="text-sm text-gray-700">
              Treść (np. &bdquo;Umyj okna&rdquo;, &bdquo;Wyczyść lodówkę&rdquo;)
            </label>
            <input
              id="label"
              name="label"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="mt-2 self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Dodaj
          </button>
        </form>
      </div>
    </div>
  );
}
