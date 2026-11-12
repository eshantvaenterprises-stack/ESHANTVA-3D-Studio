import { MapPin, PackageCheck, Truck } from 'lucide-react';

const announcements = [
  { icon: Truck, label: 'Pan-India Delivery' },
  { icon: PackageCheck, label: 'Custom Orders Reviewed Individually' },
  { icon: MapPin, label: 'Local Pickup by Appointment' },
];

export function AnnouncementBar() {
  return (
    <div className="announcement-bar" aria-label="Service information">
      <div className="announcement-track shell">
        {announcements.map(({ icon: Icon, label }) => (
          <span key={label} className="announcement-item">
            <Icon size={14} aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
