export function humanDistance(n: number | undefined) {
	if (!n) {
		return '??m';
	}
	let units = 'm';

	if (n >= 1000) {
		n = n / 1000;
		units = 'km';
	}
	return `${Math.floor(n)}${units}`;
}

function wmoInterpretation(color: string, description: string, icon: string) {
	color = color || '#9E9200';
	icon = `/icons/airy/${icon}@4x.png`;

	return {
		description,
		icon
	};
}

export const WMO_CODES: Record<number, any> = {
	0: wmoInterpretation('#F1F1F1', 'Clear', 'clear'),

	1: wmoInterpretation('#E2E2E2', 'Mostly Clear', 'mostly-clear'),
	2: wmoInterpretation('#C6C6C6', 'Partly Cloudy', 'partly-cloudy'),
	3: wmoInterpretation('#ABABAB', 'Overcast', 'overcast'),

	45: wmoInterpretation('#A4ACBA', 'Fog', 'fog'),
	48: wmoInterpretation('#8891A4', 'Icy Fog', 'rime-fog'),

	51: wmoInterpretation('#3DECEB', 'Light Drizzle', 'light-drizzle'),
	53: wmoInterpretation('#0CCECE', 'Drizzle', 'moderate-drizzle'),
	55: wmoInterpretation('#0AB1B1', 'Heavy Drizzle', 'dense-drizzle'),

	80: wmoInterpretation('#9BCCFD', 'Light Showers', 'light-rain'),
	81: wmoInterpretation('#51B4FF', 'Showers', 'moderate-rain'),
	82: wmoInterpretation('#029AE8', 'Heavy Showers', 'heavy-rain'),

	61: wmoInterpretation('#BFC3FA', 'Light Rain', 'light-rain'),
	63: wmoInterpretation('#9CA7FA', 'Rain', 'moderate-rain'),
	65: wmoInterpretation('#748BF8', 'Heavy Rain', 'heavy-rain'),

	56: wmoInterpretation('#D3BFE8', 'Light Freezing Drizzle', 'light-freezing-drizzle'),
	57: wmoInterpretation('#A780D4', 'Freezing Drizzle', 'dense-freezing-drizzle'),

	66: wmoInterpretation('#CAC1EE', 'Light Freezing Rain', 'light-freezing-rain'),
	67: wmoInterpretation('#9486E1', 'Freezing Rain', 'heavy-freezing-rain'),

	71: wmoInterpretation('#F9B1D8', 'Light Snow', 'slight-snowfall'),
	73: wmoInterpretation('#F983C7', 'Snow', 'moderate-snowfall'),
	75: wmoInterpretation('#F748B7', 'Heavy Snow', 'heavy-snowfall'),

	77: wmoInterpretation('#E7B6EE', 'Snow Grains', 'snowflake'),

	85: wmoInterpretation('#E7B6EE', 'Light Snow Showers', 'slight-snowfall'),
	86: wmoInterpretation('#CD68E0', 'Snow Showers', 'heavy-snowfall'),

	95: wmoInterpretation('#525F7A', 'Thunderstorm', 'thunderstorm'),

	96: wmoInterpretation('#3D475C', 'Light T-storm w/ Hail', 'thunderstorm-with-hail'),
	99: wmoInterpretation('#2A3140', 'T-storm w/ Hail', 'thunderstorm-with-hail')
};

export function wmoCode(code: number | undefined) {
	if (code !== undefined) {
		return WMO_CODES[code];
	}
	return {
		description: '...',
		icon: ''
	};
}

export function celcius(f: number | undefined) {
	if (typeof f !== 'number') {
		return undefined;
	}
	return (f - 32) * (5 / 9);
}