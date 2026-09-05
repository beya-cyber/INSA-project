import React, { useEffect, useState } from 'react';

export default function TriageConsole() {
    const [incidents, setIncidents] = useState([]);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchIncidents();
    }, []);

    const fetchIncidents = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/triage/incidents');
            const data = await res.json();
            setIncidents(data);
        } catch (err) {
            console.error("Failed to load triage queue", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (incidentId, action) => {
        try {
            const res = await fetch(`http://localhost:8000/api/v1/triage/incidents/${incidentId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, analyst_id: "ANALYST_INSA_009" }),
            });
            if (res.ok) {
                fetchIncidents();
                setSelectedIncident(null);
            }
        } catch (err) {
            alert("Action execution failed.");
        }
    };

    if (loading) return <div className="p-6 text-center text-gray-500">Loading Triage Dashboard...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">INSA Ethio-CERT Triage Dashboard</h1>
                    <p className="text-sm text-gray-500">National Scam Monitoring & Administrative Intercept Queue</p>
                </div>
                <button onClick={fetchIncidents} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold">
                    Refresh Queue
                </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Incident Queue Table */}
                <div className="col-span-2 bg-white rounded-xl shadow border overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
                            <tr>
                                <th className="p-3">Case Number</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Target Provider</th>
                                <th className="p-3">Risk Score</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {incidents.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedIncident(item)}>
                                    <td className="p-3 font-mono font-bold text-blue-600">{item.case_number}</td>
                                    <td className="p-3">{item.scam_category}</td>
                                    <td className="p-3">{item.target_provider || 'N/A'}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${item.risk_score >= 70 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {item.risk_score.toFixed(1)} / 100
                                        </span>
                                    </td>
                                    <td className="p-3 text-xs font-semibold">{item.status}</td>
                                    <td className="p-3">
                                        <button className="text-blue-600 font-semibold hover:underline">Inspect</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Detailed Inspector Panel */}
                <div className="bg-white p-6 rounded-xl shadow border space-y-4">
                    <h2 className="font-bold text-lg border-b pb-2 text-gray-800">Case Investigation</h2>
                    {selectedIncident ? (
                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="text-gray-500 block">Case Number:</span>
                                <span className="font-mono font-bold">{selectedIncident.case_number}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Scammer Phone:</span>
                                <span className="font-mono">{selectedIncident.scammer_phone || 'Unlisted'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block">Transaction Reference:</span>
                                <span className="font-mono">{selectedIncident.transaction_reference || 'Unlisted'}</span>
                            </div>

                            <div className="pt-4 border-t space-y-2">
                                <button
                                    onClick={() => handleAction(selectedIncident.id, 'TEMPORARY_FREEZE')}
                                    className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold text-xs hover:bg-red-700"
                                >
                                    Trigger 48h Bank Asset Lock
                                </button>
                                <button
                                    onClick={() => handleAction(selectedIncident.id, 'ESCALATE')}
                                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold text-xs hover:bg-blue-700"
                                >
                                    Escalate to Police Bureau
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm">Select an incident from the queue to inspect details and issue hold orders.</p>
                    )}
                </div>
            </div>
        </div>
    );
}