import express from 'express';
import { LRUCache } from 'lru-cache';
import ComciganParser from 'comcigan-parser';

const app = express();
const port = process.env.PORT || 3000;

// Cache timetable for 10 minutes to reduce parser/network load
const cache = new LRUCache({
	max: 64,
	tl: 1000 * 60 * 10,
});

app.use(express.static('public'));

async function fetchSejongClassSchedule() {
	const cacheKey = 'sejong-1-1';
	const cached = cache.get(cacheKey);
	if (cached) return cached;

	const parser = new ComciganParser();
	await parser.init();

	// Search for the school by name (세종과학고등학교)
	const schools = await parser.search('세종과학고등학교');
	if (!schools || schools.length === 0) {
		throw new Error('학교를 찾을 수 없습니다: 세종과학고등학교');
	}

	// Pick the first matched school. If there are multiple, you may need to refine logic.
	const school = schools[0];
	await parser.setSchool(school.code);

	const grade = 1;
	const classNo = 1;

	// Fetch class timetable with fallback. Library returns a 2D array [day][period]
	let table = null;
	if (typeof parser.getClassTimetable === 'function') {
		try {
			table = await parser.getClassTimetable(grade, classNo);
		} catch (_e) {
			// ignore and try fallback below
		}
	}
	if (!table) {
		const full = typeof parser.getTimetable === 'function' ? await parser.getTimetable() : null;
		table = full?.[grade]?.[classNo];
	}

	// Normalize to strings for UI: prefer subject/name fields when available
	const days = 5; // Mon-Fri
	const periods = 7; // 1-7 periods (adjust if your school differs)
	const normalized = Array.from({ length: days }, (_, d) =>
		Array.from({ length: periods }, (_, p) => {
			const cell = table?.[d]?.[p];
			if (cell == null) return null;
			if (typeof cell === 'string') return cell;
			if (cell?.subject) return cell.subject;
			if (cell?.name) return cell.name;
			return String(cell);
		})
	);

	cache.set(cacheKey, normalized);
	return normalized;
}

app.get('/api/health', (req, res) => {
	res.json({ ok: true });
});

app.get('/api/schedule', async (req, res) => {
	try {
		const data = await fetchSejongClassSchedule();
		res.json({
			school: '세종과학고등학교',
			grade: 1,
			class: 1,
			days: ['월', '화', '수', '목', '금'],
			periods: [1, 2, 3, 4, 5, 6, 7],
			entries: data,
		});
	} catch (error) {
		res.status(500).json({ error: error?.message || '시간표 조회 실패' });
	}
});

app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
});