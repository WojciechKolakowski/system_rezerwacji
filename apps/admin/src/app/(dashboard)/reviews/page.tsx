import { prisma } from "@system-rezerwacji/shared";

export default async function ReviewsPage() {
  const reviews = await prisma.review.findMany({
    include: {
      client: { include: { user: true } },
      booking: { include: { employee: { include: { user: true } }, serviceType: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Oceny klientów</h1>
      {averageRating && (
        <p className="mb-6 text-sm text-gray-500">
          Średnia ocena: <strong>{averageRating} / 5</strong> ({reviews.length}{" "}
          {reviews.length === 1 ? "ocena" : "ocen"})
        </p>
      )}

      <div className="flex flex-col gap-3">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">
                {review.client.user.name}
                {review.booking.employee && ` · sprzątał(a): ${review.booking.employee.user.name}`}
              </p>
              <span className="text-sm font-semibold text-amber-600">
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {review.booking.serviceType.name} · {review.createdAt.toLocaleDateString("pl-PL")}
            </p>
            {review.comment && <p className="mt-2 text-sm text-gray-700">{review.comment}</p>}
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-400">
            Brak ocen.
          </p>
        )}
      </div>
    </div>
  );
}
