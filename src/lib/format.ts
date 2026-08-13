export const ETB = (amount: number | string | null | undefined) => {
  const n = Number(amount ?? 0);
  return `${n.toLocaleString("en-ET", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })} ETB`;
};

export const discounted = (price: number, discountPercent: number) =>
  discountPercent > 0 ? Math.round(price * (1 - discountPercent / 100) * 100) / 100 : price;

export const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const isShopOpen = (opensAt?: string | null, closesAt?: string | null) => {
  if (!opensAt || !closesAt) return true;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => {
    const [h, m] = t.split(":");
    return Number(h) * 60 + Number(m ?? 0);
  };
  const open = toMin(opensAt);
  const close = toMin(closesAt);
  return close > open ? mins >= open && mins <= close : mins >= open || mins <= close;
};