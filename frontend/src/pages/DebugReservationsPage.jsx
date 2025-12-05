// frontend/src/pages/DebugReservationsPage.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';

function DebugReservationsPage() {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        apiClient.get('/debug/reservations/')
            .then(response => {
                setReservations(response.data);
                setLoading(false);
            })
            .catch(err => {
                setError(err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error loading data: {error.message}</div>;
    }

    if (reservations.length === 0) {
        return <div>No reservations found.</div>;
    }

    const headers = Object.keys(reservations[0]);

    return (
        <div style={{ padding: '20px' }}>
            <h1>Debug: Reservation List (Raw Data)</h1>
            <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #ddd' }}>
                <thead>
                    <tr style={{ background: '#f2f2f2' }}>
                        {headers.map(header => (
                            <th key={header} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {reservations.map(res => (
                        <tr key={res.id}>
                            {headers.map(header => (
                                <td key={`${res.id}-${header}`} style={{ border: '1px solid #ddd', padding: '8px' }}>
                                    {typeof res[header] === 'object' && res[header] !== null ? JSON.stringify(res[header]) : res[header]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default DebugReservationsPage;
