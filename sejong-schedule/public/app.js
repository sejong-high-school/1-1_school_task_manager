async function loadSchedule() {
	const res = await fetch('/api/schedule');
	if (!res.ok) throw new Error('시간표 API 호출 실패');
	return await res.json();
}

function renderLoading() {
	const root = document.getElementById('app');
	root.innerHTML = '<div class="p-6 text-center text-gray-600">불러오는 중...</div>';
}

function renderError(message) {
	const root = document.getElementById('app');
	root.innerHTML = `<div class="p-6 text-center text-red-600">${message}</div>`;
}

function renderSchedule(payload) {
	const root = document.getElementById('app');
	root.innerHTML = '';

	const card = document.createElement('div');
	card.className = 'bg-white rounded-lg shadow-sm border border-gray-200';

	const table = document.createElement('table');
	table.className = 'min-w-full table-fixed border-collapse';

	const thead = document.createElement('thead');
	thead.innerHTML = '<tr class="bg-blue-50">\
		<th class="p-2 border font-semibold text-gray-700">요일 / 교시</th>' +
		payload.periods.map(p => `<th class="p-2 border text-center">${p}</th>`).join('') +
		'</tr>';

	const tbody = document.createElement('tbody');
	for (let d = 0; d < payload.days.length; d++) {
		const tr = document.createElement('tr');
		tr.innerHTML = `<td class="p-2 border bg-gray-50 font-semibold">${payload.days[d]}</td>`;
		for (let p = 0; p < payload.periods.length; p++) {
			const td = document.createElement('td');
			td.className = 'p-2 border text-center';
			const value = payload.entries?.[d]?.[p];
			td.textContent = value || '-';
			tr.appendChild(td);
		}
		tbody.appendChild(tr);
	}

	table.appendChild(thead);
	table.appendChild(tbody);
	card.appendChild(table);
	root.appendChild(card);
}

renderLoading();
loadSchedule().then(renderSchedule).catch(err => {
	console.error(err);
	renderError('시간표를 불러오지 못했습니다. 잠시 후 다시 시도하세요.');
});

