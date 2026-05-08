interface ScheduleData {
  origin: string;
  destination: string;
  days: string[];
  departureTime: string;
  returnTrip: boolean;
  returnTime?: string;
  lockedPrice: string;
}

export default function ScheduleCard({ schedule }: { schedule: ScheduleData }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold tracking-widest text-[#00A8A8] uppercase">
          Commute Pass
        </span>
        <span className="bg-[#00A8A8] text-white text-xs font-semibold px-3 py-1 rounded-full">
          Price Locked
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">From</p>
          <p className="text-sm font-medium text-gray-800">{schedule.origin}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">To</p>
          <p className="text-sm font-medium text-gray-800">{schedule.destination}</p>
        </div>

        <div className="flex gap-1 flex-wrap">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => {
            const fullDay = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" }[d];
            const active = schedule.days.includes(fullDay!);
            return (
              <span
                key={d}
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  active
                    ? "bg-[#00A8A8] text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {d}
              </span>
            );
          })}
        </div>

        <div className="flex justify-between text-sm">
          <div>
            <p className="text-xs text-gray-400">Departure</p>
            <p className="font-medium text-gray-800">{schedule.departureTime}</p>
          </div>
          {schedule.returnTrip && schedule.returnTime && (
            <div>
              <p className="text-xs text-gray-400">Return</p>
              <p className="font-medium text-gray-800">{schedule.returnTime}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400">Per Ride</p>
            <p className="font-medium text-[#00A8A8]">{schedule.lockedPrice}</p>
          </div>
        </div>
      </div>

      <button className="mt-4 w-full bg-[#1A2332] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#00A8A8] transition-colors">
        Confirm Schedule
      </button>
    </div>
  );
}