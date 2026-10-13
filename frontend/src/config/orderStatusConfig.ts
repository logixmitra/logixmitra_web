export const ORDER_STATUS_GROUPS = [
  {
    label: "Shipment Booking",
    chips: [
      { label: "New", value: "Pending" },
      { label: "Courier Assigned", value: "READY FOR DISPATCH" },
      { label: "Pickups & Manifests", value: "Out for Pickup" },
    ],
  },
  {
    label: "Shipment Journey",
    chips: [
      { label: "In Transit", value: "In Transit" },
      { label: "Out For Delivery", value: "Out for Delivery" },
      { label: "Delivered", value: "Delivered" },
    ],
  },
  {
    label: "NDR Exceptions",
    chips: [
      { label: "NDR", value: "UNDELIVERED" },
      { label: "RTO In-Transit", value: "RTO In transit" },
      { label: "RTO Delivered", value: "RTO Delivered" },
    ],
  },
  {
    label: "",
    chips: [
      { label: "All", value: "all" },
      { label: "Cancelled", value: "Cancelled" },
    ],
  },
];
