//#region node_modules/.nitro/vite/services/ssr/assets/hours-DAwDABcJ.js
var DAY_NAMES = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday"
];
var toMinutes = (t) => {
	const [h, m] = t.split(":");
	return Number(h) * 60 + Number(m ?? 0);
};
var withinWindow = (opensAt, closesAt, now) => {
	const mins = now.getHours() * 60 + now.getMinutes();
	const open = toMinutes(opensAt);
	const close = toMinutes(closesAt);
	return close > open ? mins >= open && mins <= close : mins >= open || mins <= close;
};
/**
* A shop is open only when the merchant/admin "online" override is on AND
* the current time falls inside today's weekly schedule (falling back to the
* shop-level opens_at/closes_at when no per-day rows exist).
*/
function isShopOpenNow(shop, hours, now = /* @__PURE__ */ new Date()) {
	if (shop.is_online === false) return false;
	const today = hours?.find((h) => h.day_of_week === now.getDay());
	if (today) {
		if (today.is_closed) return false;
		return withinWindow(today.opens_at, today.closes_at, now);
	}
	if (!shop.opens_at || !shop.closes_at) return true;
	return withinWindow(shop.opens_at, shop.closes_at, now);
}
/** Human-readable reason a shop is closed, for checkout/lock messaging. */
function closedReason(shop, hours) {
	if (shop.is_online === false) return "This shop is temporarily offline.";
	if ((hours?.find((h) => h.day_of_week === (/* @__PURE__ */ new Date()).getDay()))?.is_closed) return "This shop is closed today.";
	return "This shop is currently outside its opening hours.";
}
//#endregion
export { closedReason as n, isShopOpenNow as r, DAY_NAMES as t };
