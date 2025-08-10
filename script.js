// get weather data from API
const apiKey = 'CWA-E6250F8B-771C-4425-979A-C15FD4F2E586';
// Type codes
const TaiwanEachDistrictCode = 'F-D0047-093';
const TaipeiOneWeek = 'F-D0047-063';

document.addEventListener('DOMContentLoaded', function() {
    // All districts in Taipei City
    const taipeiDistricts = [
        "中正區", "大同區", "中山區", "松山區", "大安區", "萬華區", "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"
    ];

    const select = document.getElementById('district-select');
    const forecastContainer = document.getElementById('weather-forecast');

    // Populate district selection
    taipeiDistricts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        select.appendChild(opt);
    });

    select.addEventListener('change', function() {
        const district = select.value;
        if (!district) {
            forecastContainer.style.display = 'none';
            forecastContainer.innerHTML = '';
            return;
        }
        // Fetch weather data for the selected district
        fetchWeather(district);
    });

    function fetchWeather(district) {
        forecastContainer.innerHTML = '載入中...';
        // Using block display to accommodate the table
        forecastContainer.style.display = 'block';
        const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${TaiwanEachDistrictCode}?Authorization=${apiKey}&locationId=${TaipeiOneWeek}&LocationName=${encodeURIComponent(district)}&ElementName=${encodeURIComponent("天氣預報綜合描述")}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                const location = data?.records?.Locations?.[0]?.Location?.[0];
                if (!location) throw new Error('無法取得地點資料');
                const weatherElements = location.WeatherElement || [];
                // Get "天氣預報綜合描述"
                const descElement = weatherElements.find(e => e.ElementName === '天氣預報綜合描述');
                if (!descElement) throw new Error('找不到天氣預報綜合描述');

                // Keep only 06:00 and 18:00 these two starting time, ignore 00:00–06:00
                let slots = (descElement.Time || []).filter(t => {
                    const st = new Date(t.StartTime);
                    const h = st.getHours();
                    return h === 6 || h === 18;
                });

                // Get 7 days x 2 time slices = 14 datas
                if (slots.length > 14) slots = slots.slice(0, 14);
                if (slots.length === 0) throw new Error('沒有可用的時段資料');

                // First available time slice is Day 0, for creating 7 days columns
                const firstStart = new Date(slots[0].StartTime);
                const day0 = new Date(firstStart.getFullYear(), firstStart.getMonth(), firstStart.getDate());

                // Create 7 days column labels (weekdays), starting from the date of the first data point
                const weekMap = ['日','一','二','三','四','五','六'];
                const dayLabels = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(day0);
                    d.setDate(d.getDate() + i);
                    return `星期${weekMap[d.getDay()]}`;
                });

                // Create 2x7 grid: 0=day(06-18), 1=night(18-06)
                const grid = Array.from({ length: 2 }, () => Array(7).fill(null));

                slots.forEach(s => {
                    const st = new Date(s.StartTime);
                    const startDay = new Date(st.getFullYear(), st.getMonth(), st.getDate());
                    const offset = Math.round((startDay - day0) / 86400000);
                    if (offset < 0 || offset > 6) return;
                    const hour = st.getHours();
                    const periodIdx = hour === 6 ? 0 : 1; // 0: day, 1: night
                    const raw = s.ElementValue?.[0] || {};
                    const desc = raw.WeatherDescription || raw.value || '';
                    const tempMatch = desc.match(/溫度攝氏(\d+)至(\d+)度/);
                    const popMatch = desc.match(/降雨機率(\d+)%/);
                    const temp = tempMatch ? `${tempMatch[1]}-${tempMatch[2]}°C` : '--';
                    const pop = popMatch ? `${popMatch[1]}%` : '--';
                    grid[periodIdx][offset] = {
                        period: periodIdx === 0 ? '白天' : '晚上',
                        temp,
                        pop,
                        desc
                    };
                });

                renderWeather({ grid, dayLabels });
            })
            .catch((err) => {
                console.error(err);
                forecastContainer.innerHTML = '資料取得失敗';
            });
    }

    function renderWeather({ grid, dayLabels }) {
        // Create 7 days columns, 2 rows (day, night)
        forecastContainer.innerHTML = '';
        const periods = ['白天', '晚上'];

        const table = document.createElement('table');
        table.style.borderCollapse = 'separate';
        table.style.margin = '0 auto';
        table.style.width = 'auto';

        // head (7 days)
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        dayLabels.forEach(label => {
            const th = document.createElement('th');
            th.textContent = label;
            th.style.padding = '8px';
            th.style.fontWeight = 'bold';
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        // body (2 rows: day / night)
        const tbody = document.createElement('tbody');
        periods.forEach((p, periodIdx) => {
            const row = document.createElement('tr');
            for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
                const td = document.createElement('td');
                td.style.padding = '8px';
                td.style.textAlign = 'center';
                td.style.verticalAlign = 'middle';
                td.style.background = '#fff';
                td.style.borderRadius = '10px';
                td.style.boxShadow = '0 4px 6px rgba(0,0,0,0.08)';
                td.style.width = '140px';
                td.style.height = '110px';

                const cell = grid?.[periodIdx]?.[dayIdx] || null;
                if (cell) {
                    // Get short description
                    const shortDesc = (cell.desc || '').split('。')[0] || '';
                    td.innerHTML = `
                        <div style="font-weight:600; margin-bottom:6px;">${cell.period}</div>
                        <div class="temp" style="font-size:16px; color:#333;">${cell.temp}</div>
                        <div style="font-size:12px; color:#666; margin-top:2px;">降雨 ${cell.pop}</div>
                        <div style="font-size:12px; color:#555; margin-top:6px; line-height:1.2;">${shortDesc}</div>
                    `;
                } else {
                    td.innerHTML = `
                        <div style="font-weight:600; margin-bottom:6px;">${p}</div>
                        <div class="temp" style="font-size:16px; color:#333;">--</div>
                        <div style="font-size:12px; color:#666; margin-top:2px;">降雨 --</div>
                        <div style="font-size:12px; color:#555; margin-top:6px; line-height:1.2;">--</div>
                    `;
                }
                row.appendChild(td);
            }
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        forecastContainer.appendChild(table);
    }
    }
);