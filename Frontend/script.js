const API = 'http://127.0.0.1:5000';

// Fetch all data
async function loadDashboard() {
    try {
        const [meterRes, attackedRes, detectionRes] = await Promise.all([
            fetch(`${API}/api/meter-data`),
            fetch(`${API}/api/attacked-data`),
            fetch(`${API}/api/detection-results`)
        ]);

        const meterData = await meterRes.json();
        const attackedData = await attackedRes.json();
        const detectionData = await detectionRes.json();

        // Update stats cards
        document.getElementById('total-readings').textContent = meterData.length;
        document.getElementById('total-attacks').textContent = attackedData.length;
        document.getElementById('total-detections').textContent = 
            detectionData.filter(d => d[5] > 0).length;
        
        const avgRisk = detectionData.reduce((sum, d) => sum + d[6], 0) / detectionData.length;
        document.getElementById('avg-risk').textContent = avgRisk.toFixed(1);

        // Energy Chart
        const labels = meterData.slice(0, 50).map(d => d[2].slice(11, 16));
        const normalEnergy = meterData.slice(0, 50).map(d => d[3]);
        const attackedEnergy = attackedData.slice(0, 50).map(d => d[11]);

        new Chart(document.getElementById('energyChart'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Normal Energy (kWh)',
                        data: normalEnergy,
                        borderColor: '#60a5fa',
                        backgroundColor: 'rgba(96, 165, 250, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Attacked Energy (kWh)',
                        data: attackedEnergy,
                        borderColor: '#f87171',
                        backgroundColor: 'rgba(248, 113, 113, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: '#e2e8f0' } } },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
                }
            }
        });

        // Risk Chart
        const riskCounts = { NORMAL: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
        detectionData.forEach(d => {
            const level = d[7];
            if (riskCounts[level] !== undefined) riskCounts[level]++;
        });

        new Chart(document.getElementById('riskChart'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(riskCounts),
                datasets: [{
                    data: Object.values(riskCounts),
                    backgroundColor: ['#60a5fa', '#34d399', '#fbbf24', '#fb923c', '#f87171']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { labels: { color: '#e2e8f0' } } }
            }
        });

        // Anomaly Alerts Table
        const tbody = document.getElementById('anomaly-table');
        tbody.innerHTML = '';
        detectionData.slice(0, 50).forEach(d => {
            const riskLevel = d[7];
            const riskClass = `risk-${riskLevel.toLowerCase()}`;
            tbody.innerHTML += `
                <tr>
                    <td>${d[1]}</td>
                    <td>${d[2]}</td>
                    <td>${d[6]}</td>
                    <td class="${riskClass}">${riskLevel}</td>
                    <td>${d[8]}</td>
                    <td>${d[5] === 1 ? '✅ Yes' : '❌ No'}</td>
                </tr>
            `;
        });

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

loadDashboard();