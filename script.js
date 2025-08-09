// get weather data from API
const apiKey = 'CWA-E6250F8B-771C-4425-979A-C15FD4F2E586';
// Taipei City one week weather forecast
const taipeiOneWeekForecastCode = 'F-D0047-063';
document.addEventListener('DOMContentLoaded', function() {
    // 臺北市所有行政區
    const taipeiDistricts = [
        "中正區", "大同區", "中山區", "松山區", "大安區", "萬華區", "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"
    ];

    const select = document.getElementById('district-select');
    const forecastContainer = document.getElementById('weather-forecast');

    // 動態產生選單
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
        // 取得該地區天氣資料
        fetchWeather(district);
    });

    function fetchWeather(district) {
        forecastContainer.innerHTML = '載入中...';
        forecastContainer.style.display = 'flex';
        const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${taipeiOneWeekForecastCode}?Authorization=${apiKey}&LocationName=${encodeURIComponent(district)}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                // 直接取平均溫度前27筆，解析時段與星期
                const location = data.records.Locations[0].Location[0];
                const weatherElements = location.WeatherElement;
                const avgTempElement = weatherElements.find(e => e.ElementName === "平均溫度");
                const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
                const periods = ['凌晨','白天','晚上'];
                const weatherData = [];
                for (let i = 0; i < 27; i++) {
                    const timeObj = avgTempElement.Time[i];
                    const startTime = timeObj?.StartTime;
                    let dayStr = '--';
                    let periodStr = '--';
                    if (startTime) {
                        const date = new Date(startTime);
                        dayStr = weekDays[date.getDay()];
                        const hour = date.getHours();
                        if (hour === 0) periodStr = '凌晨';
                        else if (hour === 6) periodStr = '白天';
                        else if (hour === 18) periodStr = '晚上';
                    }
                    weatherData.push({
                        day: dayStr,
                        period: periodStr,
                        temp: timeObj?.ElementValue[0]?.Temperature || '--'
                    });
                }
                renderWeather(weatherData);
            })
            .catch(() => {
                forecastContainer.innerHTML = '資料取得失敗';
            });
    }

    function renderWeather(weatherData) {
        // 橫排七天，直排三時段
        forecastContainer.innerHTML = '';
        const days = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];
        const periods = ['凌晨','白天','晚上'];
        // 建立 3x7 的陣列
        const grid = Array.from({length: 3}, () => Array(7).fill(null));
        weatherData.forEach(item => {
            const dayIdx = days.indexOf(item.day);
            const periodIdx = periods.indexOf(item.period);
            if (dayIdx !== -1 && periodIdx !== -1) {
                grid[periodIdx][dayIdx] = item;
            }
        });
        // 建立表格
        const table = document.createElement('table');
        table.style.borderCollapse = 'separate';
        table.style.margin = '0 auto';
        table.style.width = 'auto';
        // 表頭
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        days.forEach(day => {
            const th = document.createElement('th');
            th.textContent = day;
            th.style.padding = '8px';
            th.style.fontWeight = 'bold';
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);
        // 表身
        const tbody = document.createElement('tbody');
        periods.forEach((period, periodIdx) => {
            const row = document.createElement('tr');
            for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
                const td = document.createElement('td');
                td.style.padding = '8px';
                td.style.textAlign = 'center';
                td.style.verticalAlign = 'middle';
                td.style.background = '#fff';
                td.style.borderRadius = '10px';
                td.style.boxShadow = '0 4px 6px rgba(0,0,0,0.08)';
                td.style.width = '120px';
                td.style.height = '80px';
                const item = grid[periodIdx][dayIdx];
                if (item) {
                    td.innerHTML = `<div style="font-weight:bold;">${item.period}</div><div class="temp">${item.temp}°C</div>`;
                } else {
                    td.innerHTML = `<div>--</div><div class="temp">--°C</div>`;
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