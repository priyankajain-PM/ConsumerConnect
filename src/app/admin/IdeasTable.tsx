import { format, parseISO } from "date-fns";

interface IdeaRow {
  id: string;
  ideaText: string;
  customerEmail: string;
  customerPhone: string | null;
  createdAt: string;
  submittedWithoutBooking: boolean;
}

export function IdeasTable({ rows }: { rows: IdeaRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-10 text-center text-sm text-gray-400">
        No ideas submitted yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-y-auto max-h-[600px]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white z-10">
          <tr className="border-b border-gray-100 text-left">
            <th className="px-4 py-3 font-medium text-gray-500 w-40">Date</th>
            <th className="px-4 py-3 font-medium text-gray-500 w-44">Customer</th>
            <th className="px-4 py-3 font-medium text-gray-500">Idea</th>
            <th className="px-4 py-3 font-medium text-gray-500 w-24 text-center">Type</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className={`border-b border-gray-50 align-top ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
              <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                {format(parseISO(row.createdAt), "MMM d, h:mm a")}
              </td>
              <td className="px-4 py-3 text-gray-600 max-w-[11rem]">
                <div className="truncate">{row.customerEmail}</div>
                {row.customerPhone && <div className="text-xs text-gray-400 mt-0.5">{row.customerPhone}</div>}
              </td>
              <td className="px-4 py-3 text-gray-800 leading-relaxed">
                {row.ideaText || <span className="text-gray-400 italic">No text</span>}
              </td>
              <td className="px-4 py-3 text-center">
                {row.submittedWithoutBooking ? (
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-yellow-50 text-yellow-700 border border-yellow-200">
                    Idea only
                  </span>
                ) : (
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">
                    + Booking
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
