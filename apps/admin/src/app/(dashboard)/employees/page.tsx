import { prisma } from "@system-rezerwacji/shared";
import {
  createAvailability,
  createEmployee,
  deleteAvailability,
  toggleEmployeeActive,
} from "./actions";

const WEEKDAY_LABELS = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

export default async function EmployeesPage() {
  const [employees, districts, availability] = await Promise.all([
    prisma.employee.findMany({ include: { user: true }, orderBy: { createdAt: "asc" } }),
    prisma.district.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.employeeAvailability.findMany({
      include: { employee: { include: { user: true } }, district: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Pracownicy</h1>

      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Imię i nazwisko</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td className="px-4 py-3">{employee.user.name}</td>
                <td className="px-4 py-3">{employee.user.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      employee.active
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                        : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                    }
                  >
                    {employee.active ? "aktywny" : "nieaktywny"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={toggleEmployeeActive}>
                    <input type="hidden" name="id" value={employee.id} />
                    <button type="submit" className="text-xs text-gray-500 hover:text-gray-900">
                      {employee.active ? "Dezaktywuj" : "Aktywuj"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Brak pracowników — dodaj pierwszego poniżej.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mb-10 max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Dodaj pracownika</h2>
        <form action={createEmployee} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm text-gray-700">
              Imię i nazwisko
            </label>
            <input
              id="name"
              name="name"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm text-gray-700">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm text-gray-700">
              Hasło startowe (min. 8 znaków)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={8}
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

      <h2 className="mb-4 text-xl font-semibold text-gray-900">Dostępność (harmonogram tygodniowy)</h2>

      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Pracownik</th>
              <th className="px-4 py-3">Dzielnica</th>
              <th className="px-4 py-3">Dzień</th>
              <th className="px-4 py-3">Godziny</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {availability.map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-3">{entry.employee.user.name}</td>
                <td className="px-4 py-3">{entry.district.name}</td>
                <td className="px-4 py-3">{WEEKDAY_LABELS[entry.dayOfWeek]}</td>
                <td className="px-4 py-3">
                  {formatTime(entry.startTime)}–{formatTime(entry.endTime)}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteAvailability}>
                    <input type="hidden" name="id" value={entry.id} />
                    <button type="submit" className="text-xs text-red-500 hover:text-red-700">
                      Usuń
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {availability.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Brak wpisów dostępności.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="max-w-xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Dodaj dostępność</h2>
        {employees.length === 0 || districts.length === 0 ? (
          <p className="text-sm text-gray-500">
            Najpierw dodaj przynajmniej jednego pracownika i jedną aktywną dzielnicę.
          </p>
        ) : (
          <form action={createAvailability} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
              <label htmlFor="employeeId" className="text-sm text-gray-700">
                Pracownik
              </label>
              <select
                id="employeeId"
                name="employeeId"
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
              <label htmlFor="districtId" className="text-sm text-gray-700">
                Dzielnica
              </label>
              <select
                id="districtId"
                name="districtId"
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.city})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="dayOfWeek" className="text-sm text-gray-700">
                Dzień tygodnia
              </label>
              <select
                id="dayOfWeek"
                name="dayOfWeek"
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {WEEKDAY_LABELS.map((label, index) => (
                  <option key={index} value={index}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div />
            <div className="flex flex-col gap-1">
              <label htmlFor="startTime" className="text-sm text-gray-700">
                Od godziny
              </label>
              <input
                id="startTime"
                name="startTime"
                type="time"
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="endTime" className="text-sm text-gray-700">
                Do godziny
              </label>
              <input
                id="endTime"
                name="endTime"
                type="time"
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="col-span-2 mt-2 self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Dodaj
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
