//#region node_modules/.nitro/vite/services/ssr/assets/audio-CMj0jvPq.js
var CUES = {
	new_order: {
		freq: [
			660,
			880,
			1320
		],
		dur: .12,
		type: "sine"
	},
	payment: {
		freq: [523, 784],
		dur: .14,
		type: "triangle"
	},
	status_update: {
		freq: [440, 660],
		dur: .1,
		type: "sine"
	}
};
var ctx = null;
var settings = {
	enabled: true,
	new_order: true,
	payment: true,
	status_update: true
};
function setAudioSettings(next) {
	settings = {
		...settings,
		...next
	};
}
function primeAudio() {
	if (typeof window === "undefined") return;
	if (!ctx) {
		const AC = window.AudioContext ?? window.webkitAudioContext;
		if (AC) ctx = new AC();
	}
	if (ctx && ctx.state === "suspended") ctx.resume();
}
function playCue(name) {
	if (!settings.enabled || !settings[name]) return;
	if (!ctx) {
		primeAudio();
		if (!ctx) return;
	}
	const cue = CUES[name];
	const now = ctx.currentTime;
	cue.freq.forEach((f, i) => {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = cue.type;
		osc.frequency.value = f;
		const start = now + i * (cue.dur + .02);
		gain.gain.setValueAtTime(1e-4, start);
		gain.gain.exponentialRampToValueAtTime(.25, start + .01);
		gain.gain.exponentialRampToValueAtTime(1e-4, start + cue.dur);
		osc.connect(gain).connect(ctx.destination);
		osc.start(start);
		osc.stop(start + cue.dur + .02);
	});
}
var sounds = {
	newOrder: () => playCue("new_order"),
	payment: () => playCue("payment"),
	statusUpdate: () => playCue("status_update")
};
async function loadAudioSettings() {
	try {
		const { supabase } = await import("./client-D2C38fHY.mjs").then((n) => n.n).then((n) => n.t);
		const { data } = await supabase.from("settings").select("value").eq("key", "audio_settings").maybeSingle();
		if (data?.value) setAudioSettings(data.value);
	} catch {}
}
//#endregion
export { primeAudio as n, sounds as r, loadAudioSettings as t };
