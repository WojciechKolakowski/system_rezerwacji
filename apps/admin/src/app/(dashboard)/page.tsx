import Link from "next/link";
import { prisma } from "@system-rezerwacji/shared";

export default async function DashboardPage() {
  const [districts, serviceTypes, pricingRules, employees, onboardingRequests] =
    await Promise.all([
      prisma.district.count(),
      prisma.serviceType.count(),
      prisma.pricingRule.count(),
      prisma.employee.count(),
      prisma.onboardingRequest.count({ where: { status: { in: ["NEW", "MEETING_SCHEDULED", "VISITED"] } } }),
    ]);

  const cards = [
    { label: "Dzielnice", value: districts, href: "/districts" },
    { label: "Rodzaje usług", value: serviceTypes, href: "/service-types" },
    { label: "Reguły cennika", value: pricingRules, href: "/pricing-rules" },
    { label: "Pracownicy", value: employees, href: "/employees" },
    { label: "Zapytania do obsłużenia", value: onboardingRequests, href: "/onboarding-requests" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Pulpit</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-emerald-400"
          >
            <p className="text-3xl font-semibold text-gray-900">{card.value}</p>
            <p className="mt-1 text-sm text-gray-500">{card.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
